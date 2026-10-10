param([switch]$SkipWebBuild, [string]$WebDist = 'dist')
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$taskProject = Join-Path $taskRoot 'android-native'
$taskPrivate = Join-Path (Split-Path $taskRoot) '.english-garden-private'
$taskTools = Join-Path $taskPrivate 'android-tools'
$taskSigning = Join-Path $taskPrivate 'android-signing'
$taskSdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android/Sdk' }
New-Item -ItemType Directory -Force $taskTools,$taskSigning | Out-Null
$taskGradle = Join-Path $taskTools 'gradle-8.11.1/bin/gradle.bat'
if (!(Test-Path $taskGradle)) {
    $taskZip = Join-Path $taskTools 'gradle-8.11.1-bin.zip'
    Invoke-WebRequest 'https://services.gradle.org/distributions/gradle-8.11.1-bin.zip' -OutFile $taskZip
    $taskExpected = (Invoke-RestMethod 'https://services.gradle.org/distributions/gradle-8.11.1-bin.zip.sha256').Trim()
    if ((Get-FileHash $taskZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $taskExpected) { throw 'Gradle 下载校验失败' }
    Expand-Archive $taskZip $taskTools -Force
}
$taskSecretPath = Join-Path $taskSigning 'password.dpapi'
$taskStorePath = Join-Path $taskSigning 'english-garden.jks'
if ((Test-Path $taskSecretPath) -xor (Test-Path $taskStorePath)) { throw '签名密钥与密码记录不完整，请恢复私密备份；禁止重新生成以免破坏覆盖升级。' }
if (!(Test-Path $taskSecretPath)) {
    if (Test-Path $taskStorePath) { throw '签名密钥存在但密码记录缺失，请恢复私密备份，不要重新生成。' }
    $taskBytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($taskBytes)
    $taskSecure = ConvertTo-SecureString ([Convert]::ToBase64String($taskBytes)) -AsPlainText -Force
    $taskSecure | ConvertFrom-SecureString | Set-Content $taskSecretPath
}
$taskSecure = Get-Content $taskSecretPath | ConvertTo-SecureString
$taskPassword = [System.Net.NetworkCredential]::new('', $taskSecure).Password
$env:GARDEN_STORE_PASSWORD = $taskPassword
$env:GARDEN_KEYSTORE = $taskStorePath
$env:ANDROID_HOME = $taskSdk
try {
    if (!(Test-Path $taskStorePath)) {
        & keytool -genkeypair -keystore $taskStorePath -alias english-garden -storepass:env GARDEN_STORE_PASSWORD -keypass:env GARDEN_STORE_PASSWORD -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=English Garden, O=English Garden, C=CN'
        if ($LASTEXITCODE -ne 0) { throw '生成签名密钥失败' }
    }
    Push-Location $taskRoot
    try {
        if (!$SkipWebBuild) { & pnpm build; if ($LASTEXITCODE -ne 0) { throw '网站构建失败' } }
        $taskDist = (Resolve-Path $WebDist).Path
        if (!(Test-Path (Join-Path $taskDist 'index.html'))) { throw '缺少网站生产构建 index.html' }
        $taskAssets = [IO.Path]::GetFullPath((Join-Path $taskProject 'app/src/main/assets'))
        if (!$taskAssets.StartsWith([IO.Path]::GetFullPath($taskProject) + [IO.Path]::DirectorySeparatorChar)) { throw '资源路径越界' }
        if (Test-Path $taskAssets) { Remove-Item -LiteralPath $taskAssets -Recurse -Force }
        New-Item -ItemType Directory $taskAssets | Out-Null
        Copy-Item (Join-Path $taskDist '*') $taskAssets -Recurse
        & $taskGradle -p $taskProject --no-daemon assembleRelease lintRelease
        if ($LASTEXITCODE -ne 0) { throw 'Android 构建或 lint 失败' }
        $taskApk = Join-Path $taskProject 'app/build/outputs/apk/release/app-release.apk'
        & (Join-Path $taskSdk 'build-tools/35.0.1/apksigner.bat') verify --verbose $taskApk
        if ($LASTEXITCODE -ne 0) { throw 'APK 签名验证失败' }
        $taskOutput = Join-Path (Split-Path $taskRoot) '英语花园-安卓.apk'
        Copy-Item $taskApk $taskOutput -Force
        Get-FileHash $taskOutput -Algorithm SHA256
    } finally { Pop-Location }
} finally {
    Remove-Item Env:GARDEN_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:GARDEN_KEYSTORE -ErrorAction SilentlyContinue
    $taskPassword = $null
}
