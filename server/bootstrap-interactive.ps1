# 两位同学的密码通过隐藏输入收集，不进入命令历史或临时文件。
$ErrorActionPreference = 'Stop'
$accounts = @()
try {
    for ($accountIndex = 1; $accountIndex -le 2; $accountIndex++) {
        $username = Read-Host "第 $accountIndex 位同学的用户名（3–40 位字母数字）"
        $displayName = Read-Host "第 $accountIndex 位同学的显示昵称"
        $secret = Read-Host '密码（至少 12 位，输入隐藏）' -AsSecureString
        $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
        try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer) }
        finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
        $accounts += @{ username = $username; displayName = $displayName; password = $password }
        $password = $null
        $secret.Dispose()
    }
    Push-Location -LiteralPath $PSScriptRoot
    try {
        $nodeArgs = @()
        if (Test-Path -LiteralPath '.env') { $nodeArgs += '--env-file=.env' }
        $nodeArgs += 'bootstrap.mjs'
        ConvertTo-Json -InputObject $accounts -Compress | & node @nodeArgs
        if ($LASTEXITCODE -ne 0) { throw '账号创建失败，请检查输入和数据库中的已有账号。' }
    } finally { Pop-Location }
} finally {
    $accounts = $null
    $password = $null
}
