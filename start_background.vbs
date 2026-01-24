Set WshShell = CreateObject("WScript.Shell")

' Get the current directory (where the script is located)
currentDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' 1. Next.js (Frontend & API)
' Runs in the root directory
WshShell.Run "cmd /c """ & currentDir & "\scripts\run_loop_cwd.bat"" . npm run dev", 0

' 2. Python Line Bot Service
' Runs in line_bot_ai directory
WshShell.Run "cmd /c """ & currentDir & "\scripts\run_loop_cwd.bat"" line_bot_ai python main.py", 0

' 3. Python Voice Service
' Runs in line_bot_ai directory
WshShell.Run "cmd /c """ & currentDir & "\scripts\run_loop_cwd.bat"" line_bot_ai python instant_voice_test.py", 0

MsgBox "九九瓦斯行智能系統已在後台啟動！" & vbCrLf & "包含：Next.js, Line Bot, 語音服務" & vbCrLf & "如需停止，請使用工作管理員結束 node.exe 和 python.exe", 64, "系統啟動成功"
