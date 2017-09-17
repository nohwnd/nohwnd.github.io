---
title: Testing class based DSC resources with Pester
date: 2015-04-30
tags: powershell, pester, dsc, testing
---

_I am using PowerShell version 5.0.10018.0 for the examples. This version of PowerShell ships with the WMF February 2015 Preview package that you can download here._

I was asked if there are any resources on testing class based DSC resources. And to be honest I am not sure. We shortly discussed the possibilities on the PS MVP mailing list, but I am still not sure what are the possibilities. So why not discover them while learning something more about the topic.

Luckily there are quite a few great resources on how to actually create a class based DSC resource, and what you need to do that. Some of them are:

Creating a Class based DSC Resource using PowerShell

Class-defined DSC resources in Windows Management Framework 5.0 Preview

Writing a custom DSC resource with PowerShell classes

### Writing the first test

I will be using the example code from the last article to go outside-in with Pester, and to pretend that I am actually writing the code myself.

At the bottom of the Microsoft article you find an example of how the finished resource is used. This example is an ideal candidate for our first integration test. This integration test will describe the basic functionality of the resource

The test looks like this:

```powershell
Describe 'Test resource' {
    It 'Adds a file correctly' {
        # -- Arrange
        Configuration Test
        {
            Import-DSCResource -module 'MyDscResource'
            FileResource file
            {
                Path = "TestDrive:\test.txt"
                Ensure = "Present"

                SourcePath = "TestDrive:\Source\test.txt"
            }
        }

        New-Item -ItemType Directory -Name Source -Path TestDrive:\
        Set-Content -Path TestDrive:\Source\test.txt -Value "some string"

        New-Item -ItemType Directory -Name Output -Path TestDrive:\

        # -- Act
        Test -OutputPath TestDrive:\Output
        Start-DscConfiguration -Verbose -Wait TestDrive:\Output

        # -- Assert
        "TestDrive:\test.txt" | should Exist
    }
}
```
I had to slightly change the code shown in the article, but that’s expected because we are using preview version of the technology. The test has three parts: Arrange, Act and Assert.

In the Arrange part I most importantly define the DSC configuration using the `FileResource` resource. The configuration defines that: “I desire the file TestDrive:\test.txt to be present”.

The configuration also defines the `SourcePath`, which is where the original file is placed. For the test I just use the TestDrive to store the file.

I also create all the needed files and folders in the Arrange part of the test.

In the Act phase I start by generating the configuration MOF file by calling it by it’s name: `Test`. And then continue to exercise the system-under-test (SUT) by actually invoking the DSC configuration.

In the last part, Assert, I check if the desired action was really performed. That is, if the file `test.txt` is in the root of the `TestDrive:\`.

This should do for our first test. So let’s run it and see if it fails.

### Running the first test

If you re-call the RED-GREEN-REFACTOR cycle of TDD, you know that now we should let the test run, and make sure it fails (RED). So let’s press F5 to do just that.

And indeed the test fails horribly.

```
At C:\Projects\TestFileDscResources\MyDscResources\MyDscResource.Tests.ps1:6 char:13
+             Import-DSCResource -module 'MyDscResource'
+             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Unable to load module 'MyDscResource': module not found.
At C:\Projects\TestFileDscResources\MyDscResources\MyDscResource.Tests.ps1:7 char:13
+             FileResource file
+             ~~~~~~~~~~~~
Undefined DSC resource 'FileResource'. Use Import-DSCResource to import the resource.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : ModuleNotFoundDuringParse
```

If you now assume that we saw the test fail and we can proceed to implement the correct behavior, you should know that this is not the case. The test failed, but it did not fail in the correct way. It must fail in the assertion to count as a proper fail.

To get to the point where the test fails correctly we can just follow the error messages, and oh boy there are many. The first few error messages suggested that there is no `FileResource` available in the module directory. There were also few Access Denied error messages. And the `TestDrive:\` also could not be found, because the configuration is done by a Windows service running as the SYSTEM account. I also had problems with remoting not being setup correctly.

So in the end I ended doing this:

- Placing `MyDscResource.psm1` and `MyDscResource.psd1` in `C:\Program Files\WindowsPowerShell\Modules\MyDscResource` (file contents are listed below)
- Setting my public network to private network
- Enabling PowerShell remoting by running Enable-PSRemoting -Force
- Running the tests AsAdministrator
- Using $TestDrive (real path to the temporary folder) instead of the TestDrive PSDrive

So the test ended up looking like this:

```powershell
Describe 'Test resource' {
    It 'Adds a file correctly' {
        # -- Arrange
        Configuration Test
        {
            Import-DSCResource -module 'MyDscResource'
            FileResource file
            {
                Path = "$testDrive\test.txt"
                Ensure = "Present"

                SourcePath = "$testDrive\Source\test.txt"
            }
        }

        New-Item -ItemType Directory -Name Source -Path $testDrive
        Set-Content -Path "$testDrive\Source\test.txt" -Value "some string"

        New-Item -ItemType Directory -Name Output -Path $testDrive

        # -- Act
        Test -OutputPath "$testDrive\Output"
        Start-DscConfiguration -Verbose -Force -Wait "$testDrive\Output"

        # -- Assert
        "$testDrive\test.txt" | should Exist
    }
}
```
And the resource is implemented like this:
```powershell
#file MyDscResource.psd1
@{
    RootModule = 'MyDscResource.psm1'

    DscResourcesToExport = 'FileResource'

    ModuleVersion = '1.0'
}
```
```powershell
#file: MyDscResource.psm1
[DscResource()]
class FileResource
{
    [DscProperty(Key)]
    [string]$Path

    [DscProperty(Mandatory)]
    [string]$SourcePath

    [DscProperty(Mandatory)]
    [string] $Ensure #not using the Ensure type yet

    [bool] Test() { return $false }

    [FileResource] Get() { return $null }

    [void] Set() {}
}
```
```
Describing Test resource
 [-] Adds a file correctly 454ms
   Expected: {C:\Users\nohwnd\AppData\[...]\test.txt} to exist
   at line: 26 in C:\Users\nohwnd\Desktop\MyDscResource.Tests.ps1
   26:         "$testDrive\test.txt" | should Exist
```
Uff!

### Making the first test green

So now that we have all the infrastructure setup satisfying the test is really simple. All you need to do is to create the `$testDrive\test.txt` file. So let’s change the `Set()` method to do that.

```powershell
#file: MyDscResource.psm1[DscResource()]
class FileResource
{
    [DscProperty(Key)]
    [string]$Path

    [DscProperty(Mandatory)]
    [string]$SourcePath

    [DscProperty(Mandatory)]
    [string] $Ensure

    [bool] Test() { return $false }

    [FileResource] Get() { return $null }

    [void] Set() {

        New-Item -Force -ItemType File $this.Path # <---

    }
}
```
Running the test now should, satisfy the assert condition. But depending on how fast you were to run the test, you did or did not get the same failure message as before. But if you keep running the tests it will fix itself and the test will become GREEN. So there must be some kind of timeout/threshold after which the module is reloaded… Uff again.

This does not look like a feasible path to test our DSC resources.

### Giving up

Giving up on actually running the resource I found there is this new cmdlet called `Invoke-DscResource` which does exactly what we need, it let’s us call the Set, Get and Test methods of the resource. But unfortunately I can’t get it to work with class based DSC resources. I always get “resource not found” exception.

Another option would be to simply import the class, instantiate it and call the methods without using the `Invoke-DscResource` cmdlet. But for some reason that does not work also. Unless the class is defined in the same file (not even in a script block) I can’t instantiate it. All of this fails:

```powershell
Import-Module "C:\Users\nohwnd\Documents\WindowsPowerShell\Modules\MyDscResource\MyDscResource.psd1"
[FileResource]::new()

$sb = [scriptblock]::Create( "class c {}")
&$sb

[c]::new()


$code = Get-Content "C:\Users\nohwnd\Documents\WindowsPowerShell\Modules\MyDscResource\MyDscResource.psm1" | Out-String
$sb = [scriptblock]::Create( $code )
&$sb

[FileResource]::new()

#remember the old days? https://johanleino.wordpress.com/2013/09/25/pester-how-to-unit-test-your-powershell-modules/
$code = Get-Content "C:\Users\nohwnd\Documents\WindowsPowerShell\Modules\MyDscResource\MyDscResource.psm1" | Out-String
Invoke-Expression $code
[FileResource]::new()
```
```
Unable to find type [FileResource]. Make sure that the assembly that contains this type is loaded.
At line:2 char:1
+ [FileResource]::new()
+ ~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (FileResource:TypeName) [], RuntimeException
    + FullyQualifiedErrorId : TypeNotFound


Unable to find type [c]. Make sure that the assembly that contains this type is loaded.
At line:5 char:1
+ [c]::new()
+ ~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (c:TypeName) [], RuntimeException
    + FullyQualifiedErrorId : TypeNotFound

Unable to find type [FileResource]. Make sure that the assembly that contains this type is loaded.
At line:12 char:1
+ [FileResource]::new()
+ ~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (FileResource:TypeName) [], RuntimeException
    + FullyQualifiedErrorId : TypeNotFound

Unable to find type [FileResource]. Make sure that the assembly that contains this type is loaded.
At line:17 char:1
+ [FileResource]::new()
+ ~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (FileResource:TypeName) [], RuntimeException
    + FullyQualifiedErrorId : TypeNotFound
```

So at the moment I don’t know how to test the class based resources, but there is new WMF preview published just few hours ago, so maybe this will change soon.
