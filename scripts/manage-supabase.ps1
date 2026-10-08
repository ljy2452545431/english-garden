param([ValidateSet('inspect','migrate','configure','accounts','sql')][string]$Mode='inspect',[string]$SqlFile)
$ErrorActionPreference='Stop'
$projectRef='cdhmiwrhirjntpelgnvq'
$taskRoot=Split-Path $PSScriptRoot -Parent
# 只读取本次官方 CLI 登录保存的 Supabase 凭据，不输出凭据。
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class GardenCredential {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Entry {
  public UInt32 Flags; public UInt32 Type; public string TargetName; public string Comment;
  public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
  public UInt32 CredentialBlobSize; public IntPtr CredentialBlob;
  public UInt32 Persist; public UInt32 AttributeCount; public IntPtr Attributes;
  public string TargetAlias; public string UserName;
 }
 [DllImport("Advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
 public static extern bool Read(string target, int type, int flags, out IntPtr credential);
 [DllImport("Advapi32.dll")] public static extern void CredFree(IntPtr ptr);
 public static string Load() {
  IntPtr ptr;
  if(!Read("Supabase CLI:supabase",1,0,out ptr)) throw new Exception("Supabase CLI 尚未登录");
  try { var entry=Marshal.PtrToStructure<Entry>(ptr); var s=Marshal.PtrToStringUni(entry.CredentialBlob,(int)entry.CredentialBlobSize/2); if(s.StartsWith("sbp_")||s.StartsWith("go-keyring-base64:")) return s; var bytes=new byte[entry.CredentialBlobSize]; Marshal.Copy(entry.CredentialBlob,bytes,0,bytes.Length); return System.Text.Encoding.UTF8.GetString(bytes); }
  finally { CredFree(ptr); }
 }
}
'@
$accessToken=[GardenCredential]::Load()
if($accessToken.StartsWith('go-keyring-base64:')){$accessToken=[System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($accessToken.Substring(18)))}
if($accessToken -notmatch '^sbp_'){throw 'Supabase CLI 凭据格式无法识别'}
$headers=@{Authorization='Bearer '+$accessToken}
$managementBase='https://api.supabase.com/v1/projects/'+$projectRef
function Query-Garden([string]$query){
 Invoke-RestMethod -Method Post -Uri ($managementBase+'/database/query') -Headers $headers -ContentType 'application/json' -Body (@{query=$query}|ConvertTo-Json -Compress) -TimeoutSec 50
}
if($Mode -eq 'inspect'){
 Query-Garden "select table_schema,table_name from information_schema.tables where table_schema='public' order by table_name" | ConvertTo-Json -Depth 4
 exit
}
if($Mode -eq 'migrate'){
 $existing=Query-Garden "select count(*) as count from information_schema.tables where table_schema='public' and table_name in ('members','states','messages','recordings')"
 if($existing[0].count -gt 0){throw '存在同名表，停止迁移以保护已有数据'}
 $sql=[System.IO.File]::ReadAllText((Join-Path $taskRoot 'supabase/migrations/202610080001_garden.sql'))
 $null=Query-Garden ('begin;'+$sql+';commit;')
 Write-Output '新站数据库和私有录音桶已创建；未覆盖已有表。'
 exit
}
if($Mode -eq 'sql'){
 if(!$SqlFile){throw '需要 SQL 文件路径'}
 $query=[System.IO.File]::ReadAllText((Resolve-Path -LiteralPath $SqlFile))
 Query-Garden $query | ConvertTo-Json -Depth 6
 exit
}
$keys=Invoke-RestMethod -Method Get -Uri ($managementBase+'/api-keys?reveal=true') -Headers $headers -TimeoutSec 30
$publicKey=($keys | Where-Object name -eq 'anon' | Select-Object -First 1).api_key
$serviceKey=($keys | Where-Object name -eq 'service_role' | Select-Object -First 1).api_key
if(!$publicKey -or !$serviceKey){throw '未取得项目运行密钥；没有输出密钥'}
$apiBase='https://'+$projectRef+'.supabase.co'
$adminHeaders=@{apikey=$serviceKey;Authorization='Bearer '+$serviceKey}
if($Mode -eq 'configure'){
 $null=Invoke-RestMethod -Method Post -Uri ($managementBase+'/secrets') -Headers $headers -ContentType 'application/json' -Body '[{"name":"ALLOWED_ORIGINS","value":"https://ljy2452545431.github.io,http://127.0.0.1:4173"}]' -TimeoutSec 40
 $null=Invoke-RestMethod -Method Patch -Uri ($managementBase+'/config/auth') -Headers $headers -ContentType 'application/json' -Body '{"disable_signup":true}' -TimeoutSec 30
 [System.IO.File]::WriteAllText((Join-Path $taskRoot '.env.local'),"VITE_API_URL=$apiBase/functions/v1/garden`nVITE_API_PUBLIC_KEY=$publicKey`n",[System.Text.UTF8Encoding]::new($false))
 Write-Output '公开前端连接配置已写入 .env.local，已关闭外部账号注册；未写入服务密钥。'
 exit
}
if($Mode -eq 'accounts'){
 $existingMembers=Query-Garden 'select count(*) as count from public.members'
 if($existingMembers[0].count -gt 0){throw '成员已存在，停止创建以避免覆盖账号'}
 $privateFolder=Join-Path (Split-Path $taskRoot -Parent) '.english-garden-private'
 $null=New-Item -ItemType Directory -Path $privateFolder -Force
 $accountFile=Join-Path $privateFolder '账号信息.txt'
 $contents='英语学习站两个专用账号。请妥善保管，不上传GitHub。'+"`r`n`r`n"
 foreach($name in @('ljy','jfl')){
  $password=[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(18))+'!9'
  $email=$name+'@english-garden.local'
  $body=@{email=$email;password=$password;email_confirm=$true;user_metadata=@{display_name=$name}} | ConvertTo-Json -Depth 3 -Compress
  $user=Invoke-RestMethod -Method Post -Uri ($apiBase+'/auth/v1/admin/users') -Headers $adminHeaders -ContentType 'application/json' -Body $body -TimeoutSec 30
  $id=$user.id
  if(!$id){throw 'Auth 未返回账号编号'}
  $null=Query-Garden "insert into public.members(id,display_name) values('$id','$name')"
  $contents+="账号：$name`r`n密码：$password`r`n实际Auth邮箱：$email`r`n`r`n"
  [System.IO.File]::WriteAllText($accountFile,$contents,[System.Text.UTF8Encoding]::new($false))
 }
 $identity=[System.Security.Principal.WindowsIdentity]::GetCurrent().Name
 & icacls $accountFile /inheritance:r /grant:r "${identity}:F" | Out-Null
 Write-Output ('两个账号已创建；初始密码只保存在本机私密文件：'+$accountFile)
}
