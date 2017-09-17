---
title: Lowering IO Priority of PowerShell Process
date: 2015-03-06
tags: powershell, priority, process
---

This week brought quite a few challenges. One of them was a question asked by a friend:

> How do I search contents of all the files for given string, without killing the performance of the computer?

This seemed like a simple question to answer: Just lower the priority of the PowerShell process to Idle.

```powershell
(Get-Process -Id $pid).PriorityClass = 'Idle'
```

The only problem is, that it does not work.

That piece of code actually lowers the priority of the process. But this priority only applies to compute-bound tasks. In other words, this option is great if we don’t want the CPU to run on 100 %, but it won’t help us much with disk operations.
To confirm that you can run the following code on Idle priority and view the PowerShell.exe in Task Manager.

```powershell
$header = [Byte[]]("0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16" -split "\s")
gci (Resolve-Path $env:SystemRoot).Drive.Root -Recurse |
      where { -not $_.PsIsContainer } |
      foreach {
            $content = Get-Content -TotalCount ($header.Count) -Encoding Byte -Path $_.FullName
            if ($null -ne $content) {
                  if ($null -eq (Compare-Object $header $content ))
                  {
                        $_.FullName
                  }
            }
      }
}
```

On my system I can see `PowerShell.exe` exhausting 90-100 % of disk I/O resources.

At this point I was not sure if I am even setting that priority correctly so I used ProcessExplorer to check the priority and spotted this:

{% asset_img Idle.png "Idle" %}

Now I wonder, how do I lower the priority for I/O bound operations? My first was checking the enum of values you can set to the PriorityClass:

```powershell
[Enum]::GetNames(((Get-Process -Id $pid).PriorityClass).GetType())
```

Which yields:

```
Normal
Idle
High
RealTime
BelowNormal
AboveNormal
```

As you can see, nothing specific to IO. No luck there. Let’s Google, because I remember reading about this in Windows via C++.

The solution to this problem is setting the priority of the process to `PROCESS_MODE_BACKGROUND_BEGIN`, but unfortunately .NET does not offer this functionality, so we’ll need to P/Invoke. Pretty easy to do in PowerShell. Just create a piece of C# code that’s compiled on runtime using the Add-Type cmdlet and you should be good to go.

```powershell
Add-Type @"
using System;
using System.Runtime.InteropServices;

namespace Utility
{
  public class PriorityHelper
  {
    [DllImport("kernel32.dll", CharSet=CharSet.Auto, SetLastError=true)]
    static extern bool SetPriorityClass(IntPtr handle, PriorityClass priorityClass);

    public enum PriorityClass : uint
    {
        ABOVE_NORMAL_PRIORITY_CLASS = 0x8000,
        BELOW_NORMAL_PRIORITY_CLASS = 0x4000,
        HIGH_PRIORITY_CLASS = 0x80,
        IDLE_PRIORITY_CLASS = 0x40,
        NORMAL_PRIORITY_CLASS = 0x20,
        PROCESS_MODE_BACKGROUND_BEGIN = 0x100000,// 'Windows Vista/2008 and higher
        PROCESS_MODE_BACKGROUND_END = 0x200000,//   'Windows Vista/2008 and higher
        REALTIME_PRIORITY_CLASS = 0x100
    }

    public static int SetBackgroundIoPriority ()
    {
        IntPtr id = System.Diagnostics.Process.GetCurrentProcess().Handle;
        if (SetPriorityClass(id, PriorityClass.PROCESS_MODE_BACKGROUND_BEGIN)) return (int) id;
        return -1;
    }
  }
}
"@

$result = [Utility.PriorityHelper]::SetBackgroundIoPriority()
if ($result -eq -1) {
      throw "Background IO priority could not be set or is already set"
}
```

In the previous code I am creating a static class (to make it easy to call), and importing single method from kernel32.dll. That method is called SetPriorityClass and is well documented on MSDN.aspx). I also define an enum of priorities, which defines the `PROCESS_MODE_BACKGROUND_BEGIN`, but I could also use the value directly and explain it in a comment.

Other than that I define a public method SetBackgroundIoPriority which does all the work and sets the current process IO priority to Very Low. In the last three lines of PowerShell code I am just calling that public method and throwing an exception that is not very helpful :D

{% asset_img Low.png %}
Running the same code as above now exhausts 1-3 % of my disk at best.

(It goes without saying that the script runs a lot longer now, but that’s a tradeoff for letting the foreground work to be done first.)