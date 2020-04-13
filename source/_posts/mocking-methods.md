
---
title: Mocking methods in Pester
date: 2020-04-13 10:54:00
tags: 
 - powershell
 - pester
 - testing
categories:
 - article
---

Mocking functions in Pester is easy, you just specify `Mock -CommandName f -MockWith { "mock" }` and you are done. But how do you mock a method on an object?

<!-- more -->

For our model example let's say we decided to stop a process using `wmi`, and copy some files if we were able to successfully stop the process. This scenario would happen for example when you need to update some `.dll`s and the program has them loaded. In our case we will just use `notepad.exe`, so no locking will actually occur. 

> Yes, using `wmi` is probably the most complicated way to stop a process, but a bit of complexity is what I am after. 🙂

In to try this out you can try running this snippet in Windows PowerShell. It will start a notepad process, and then immediately kill it: 

```powershell
# try running this to see how it actually behaves
& notepad.exe
$wmiObject = Get-WmiObject -Query "select * from win32_process where name='notepad.exe'"
$result = $wmiObject.Terminate()
$result.ReturnValue
```

Inspecting the members on the objects you can see that the `$wmiObject` has `.Terminate()` method. When called this method returns a result object which has `ReturnValue` property, and that property is 0 when the termination succeeded. We will mock all of that. 

```shell
PS> $wmiObject | Get-Member -Name Terminate

TypeName: System.Management.ManagementObject#root\cimv2\Win32_Process

Name      MemberType Definition
----      ---------- ----------
Terminate Method     System.Management.ManagementBaseObject Terminate(System.UInt32 Reason)

PS> $result | Get-Member -Name ReturnValue

TypeName: System.Management.ManagementBaseObject#\__PARAMETERS

Name        MemberType Definition
----        ---------- ----------
ReturnValue Property   uint32 ReturnValue {get;set;}

PS> $result.ReturnValue

0
```

Here is the how the whole test would look like, followed by explanation of each component:


```powershell
Describe "Start notepad and kill it" {
    BeforeAll {
        # this would normally go into our script
        # and we would dot-source it here like this
        # . C:\scripts\myscript.ps1
        function Update-NotepadDependencies {
            $processname = 'notepad.exe'
            $process = Get-WmiObject -Query "select * from win32_process where name='notepad.exe'"
            if ($process) {
                $result = $process.Terminate()
                if ($result.ReturnValue -eq 0) {
                    Copy-Item -Path 'C:\from' -Destination 'C:\to' -Force
                }
                else {
                    throw "Could not terminate $processName"
                }
            }
        }
    }

    Context 'When the process is active and we terminate it successfully' {
        BeforeEach {
            # the calling $wmiprocessMock.Terminate() returns an object
            # like this, so we need to do the same in our mock
            $mockResult = [PSCustomObject] @{
                ReturnValue = 0
            }

            # this is our mocked implementation of .Terminate()
            $mockTerminateMethod = {
                # count the invocation and store it on the mock object  
                # to avoid using script:scoped variables
                $this.TerminateInvoked++

                # return the result object as the real method would
                $mockResult
            }

            # Get-WmiObject -Class win32_process returns object like this so we do the same
            $mockWmiObject = [PSCustomObject] @{
                TerminateInvoked = 0
            }
            
            # add .Terminate() method to the fake wmiObject
            $mockWmiObject | Add-Member -MemberType ScriptMethod -Name Terminate -Value $mockTerminateMethod


            # the Get-WmiObject will return the mock object we made above
            Mock Get-WmiObject { $mockWmiObject }

            Mock -CommandName Copy-Item -MockWith { }
        }

        It 'Get-WmiObject was invoked with the correct filter' {
            Update-NotepadDependencies

            Assert-MockCalled `
                -CommandName Get-WmiObject `
                -ParameterFilter { $Query -eq "select * from win32_process where name='notepad.exe'" } `
                -Exactly 1
        }

        It 'Terminate method was called once on the process object' {
            Update-NotepadDependencies

            $mockWmiObject.TerminateInvoked | Should -BeExactly 1
        }

        It 'Copy-Item attempted to copy files' {
            Update-NotepadDependencies

            Assert-MockCalled -CommandName Copy-Item -Times 1
        }
    }
}
```

Explaining this rather involved example is best done backwards. So let's start from the `Mock` of `Get-WmiObject`. As we've seen the the first snippet, when the real `Get-WmiObject` is called, it returns a process object. In our mock we also return an object:

```powershell
$mockWmiObject = [PSCustomObject] @{ }
Mock Get-WmiObject { $mockWmiObject }

# this satisfies this line of code
$wmiObject = Get-WmiObject -Query "select * from win32_process where name='notepad.exe'"
``` 

This fake `wmiObject` needs to have `.Terminate()` method on it, so we add that:
 
```powershell
$mockTerminateMethod = {
    $mockResult # defined in next step
}

$mockWmiObject | Add-Member -MemberType ScriptMethod -Name Terminate -Value $mockTerminateMethod

# this satisfies this line of code
$result = $wmiObject.Terminate()
```

The `.Terminate()` method must return a result object with `ReturnValue`:

```powershell
$mockResult = [PSCustomObject] @{
    ReturnValue = 0
}

# this satisfies this line of code
$result.ReturnValue
```

## Counting the calls

Additionally to this we want to be able to check if the `.Terminate()` method was called. We could use script scoped variables for that, but that would make our tests potentially depend on each other. A much better way is to attach the info directly on the `mockObject`, and keep reference to it: 

```powershell
# arrange
$mockTerminateMethod = {
    $this.TerminateInvoked++
}

$mockWmiObject = [PSCustomObject] @{
    TerminateInvoked = 0
}

$mockWmiObject | Add-Member -MemberType ScriptMethod -Name Terminate -Value $mockTerminateMethod

# act
# we call the method on object that we got from Get-WmiObject 
# and saved it to a variable with different name
# but it is still the same instance as in mockWmiObject
$wmiObject.Terminate()

# assertion
$mockWmiObject.TerminateInvoked | Should -BeExactly 1
```

All of this combined gives us the big example above, which allows us to mock the functionality as well as count the amount of times the method was invoked. 

## Summary 

Mocking methods in PowerShell is quite easy once you get the flow of it. It relies on shadowing methods by our own script methods. Next time we will look at how to capture the parameters that were passed in. 