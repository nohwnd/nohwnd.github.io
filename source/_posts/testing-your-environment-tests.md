---
title: "Environment testing with Pester: Testing your tests"
date: 2017-12-07 20:30:54
tags: 
 - pester
 - testing 
 - environment validation
---

This always starts of as a joke:

> So do you test your tests? When you test your tests, do you test the tests that test your tests?

And people are often surprised that I in fact *do* test my tests.

With Pester there are two different ways of testing that both look very similar, but are in fact very different.

## Unit testing

The first way of testing is unit testing. This is the testing as we traditionally know it. We have a function and our goal is using tests to prove that the function works correctly. An example of such function would be this function that reverses a string:

```powershell
function Get-ReversedString ($Value) {
    $characters = $Value.ToCharArray()
    [array]::reverse($characters)

    return $characters -join ''
}
```

To test such function we would write test that gives it the string `hello` and checks that the returned string is `olleh`. Like this:

```powershell
Describe 'Get-ReversedString' {
    It "reverses string" {
        Get-ReversedString -Value 'hello' |
            Should -Be 'olleh'
    }
}
```

The test passes, because our function is implemented correctly and we are happy.

## Environment validation

The second way is environment validation. As the name suggests we are validating that our environment is correct. By environment we mean that for example an antivirus is running, domain server is available, we have enough space on our hard disk, and we don't run at 100% CPU all the time.

Let's create a very simple check that makes sure we have at least 10% of free space on our disk `C:`, which is a recommended practice for SSD disks:

```powershell
Describe 'Disk health checks' {
    It 'Has at least 10% of free space' {
        $diskInfo = Get-WmiObject win32_logicaldisk |
            where DeviceId -eq 'C:'

        $diskSize = $diskInfo.Size

        $expectedFreeSpace = $diskSize * 0.1  #10% of the total size
        $expectedFreeSpaceInGigabytes = [Math]::Round(
            $expectedFreeSpace / 1GB, 2)

        $freeSpace = $diskInfo.FreeSpace
        $freeSpaceInGigabytes = [Math]::Round($freeSpace / 1GB, 2)

        $freeSpaceInGigabytes |
            Should -BeGreaterThan $expectedFreeSpaceInGigabytes
    }
}
```

This test is pretty straightforward, and passes on my computer because I have about 320GB of free space on 500GB disk. Since this is testing the real environment your result may vary.

## The difference

Looking back at those tests, they look quite similar. They are both written in PowerShell, and they both use Pester to execute. But there is a subtle but very *important difference*. In the first test, the traditional unit test, we are controlling the input to the function. In the second test, we are not controlling the input, instead the input is taken from the environment.

This puts us in a weird position because the environment test can fail either because our test code is incorrect or because the environment is incorrect. And there is no simple way to know which one it is.

To make it even worse, we don't even know if our test _passes_ because the environment is correct, or because we made a mistake in the test code. Here is a version of the previous test that will always pass:

```powershell
# Broken test that always passes.
Describe 'Disk health checks' {
    It 'Has at least 10% of free space' {
        $diskInfo = Get-WmiObject win32_logicaldisk |
            where DeviceId -eq 'C:'

        $diskSize = $diskInfo.Size

        $expectedFreeSpace = $diskSize * 0.1  #10% of the total size
        $expectedFreeSpacelnGigabytes = [Math]::Round(
            $expectedFreeSpace / 1GB, 2)

        $freeSpace = $diskInfo.FreeSpace
        $freeSpaceInGigabytes = [Math]::Round($freeSpace / 1GB, 2)

        $freeSpaceInGigabytes |
            Should -BeGreaterThan $expectedFreeSpaceInGigabytes
    }
}
```

This is a tiny typo, but very unfortunate one. The test will always pass, and so our disk can fill with data until not a single bit is free. Yet our test will still report that the computer is in full health.

(Cannot spot the typo? Just read on.)

I am sure that you can imagine a more serious scenario than filling disk full of data. But even that sucks, especially after you spent all that time convincing your manager that automated environment tests are awesome.

Unfortunately most of the environment validation tests are written this way. In fact my example is a particularly clean and neat example of an environment test. More often environment tests are a pile of complex code showed in tests. They are then sprinkled with params, conditionals, loops; and topped with configuration file to make them reusable between environments. Don't fall in the same trap, just because you are using a test framework to run your code does not mean that your code is tested.

## Testing our ~~tests~~ environment checks

Now that we know the difference between environment tests and unit tests, let's start calling the environment tests *environment checks* instead. This way we avoid being confused about what type of test I am talking about. It may even become more obvious that environment checks and unit tests are two very different beasts.

The issue that we are facing now is that we have code in our checks that we have no easy way of testing. The solution is simple: Extract the body of the check into a function, and test that function. Like this:

```powershell
function Assert-MyDiskCHasMoreThan10PercentOfFreeSpace {
    $diskInfo = Get-WmiObject win32_logicaldisk |
        where DeviceId -eq 'C:'

    $diskSize = $diskInfo.Size

    $expectedFreeSpace = $diskSize * 0.1  #10% of the total size
    $expectedFreeSpacelnGigabytes = [Math]::Round(
        $expectedFreeSpace / 1GB, 2)

    $freeSpace = $diskInfo.FreeSpace
    $freeSpaceInGigabytes = [Math]::Round($freeSpace / 1GB, 2)

    $freeSpaceInGigabytes |
        Should -BeGreaterThan $expectedFreeSpaceInGigabytes
}

# our check
Describe 'Disk health checks' {
    It 'Has at least 10% of free space' {
        Assert-MyDiskCHasMoreThan10PercentOfFreeSpace
    }
}

# our test for the check function
Describe "Assert-MyDiskCHasMoreThan10PercentOfFreeSpace" {
    It "Throws when I have 1% of free disk space" {
        Mock Get-WmiObject {
            [PSCustomObject] @{
                DeviceId = 'C:'
                Size = 100GB
                FreeSpace = 1GB 
            }
        }

        { Assert-MyDiskCHasMoreThan10PercentOfFreeSpace } |
            Should -Throw -ExpectedMessage 'Expected {1} to be greater than {10}'
    }

    It "Passes when I have 11% of free disk space" {
        Mock Get-WmiObject {
            [PSCustomObject] @{
                DeviceId = 'C:'
                Size = 100GB
                FreeSpace = 11GB
            }
        }

        Assert-MyDiskCHasMoreThan10PercentOfFreeSpace
    }

    # more tests to make sure the check function works
}
```

Running the code you can see that the environment check passes, but one of the tests fails with:

```text
  [-] Throws when I have 1% of free disk space 64ms
    Expected: the expression to throw an exception with message {
        Expected {1} to be greater than {10}
    }, an exception was not raised, message was {}
```

The test fails because we expected an exception, but no exception was thrown. The failure message is not great, but we know that something is wrong with our code! Hooray!

A bit of digging reveals that I kept the typo from the example that always passes. In  `$expectedFreeSpacelnGigabytes` I wrote `l` instead of `I`.

Fixing the typo makes the tests pass and we just did the first step to making our environment validation more reliable and easier to maintain.

> Still not sure why it always passes?  When I made the typo, the `$expectedFreeSpaceInGigabytes` was never assigned any value and so it remained `$null`. This means that in the assertion we are comparing the free space on the disk with `$null`. Free disk space cannot be less than 0, and any positive number, including 0, is greater than `$null`. So the check will always pass.

## Tests, functions, checks

So before we go further with our refactoring, let's re-cap where we are. We now have a suite of tests for our check function. The tests use the standard unit testing techniques to make sure the function works correctly against known input. Then we have the check function itself that contains the whole body of the check and takes no parameters. And lastly we have a single check that validates the free disk space of our computer.

Just by doing a single refactoring step we moved from code that we had no way of validating, to code that we can easily test, and be pretty sure it works correctly.

## I don't have just the C: drive

Now there is probably something you've been wondering since I factored that function out:

> I have 200 different configurations of servers, with more disk letters than there are in the alphabet. Do you really think I will be writing a single function for each of them?

Probably not.

The function we extracted is an extreme case. It is extremely specialized to do only one thing, but to do it properly. This makes our check very reliable. Once the check function passed our tests, there is no way we screw up when putting it in a check.

In real life, writing a specialized function for every check is impractical. We are often prepared to sacrifice a bit of reliability for re-usability. But you must realize that every parameter is a potential bug. Take for example this function:

```powershell
function Assert-HasFreeSpace ($Disk, $Percent) {
    $diskInfo = Get-WmiObject win32_logicaldisk |
        where DeviceId -eq ($Disk + ':')

    $diskSize = $diskInfo.Size

    $expectedFreeSpace = $diskSize * (0.01 * $Percent)
    $expectedFreeSpaceInGigabytes = [Math]::Round(
        $expectedFreeSpace / 1GB, 2)

    $freeSpace = $diskInfo.FreeSpace
    $freeSpaceInGigabytes = [Math]::Round($freeSpace / 1GB, 2)

    $freeSpaceInGigabytes |
        Should -BeGreaterThan $expectedFreeSpaceInGigabytes
}
```

We can provide the drive letter, and the percentage of free space we want. In our check we would use it like this:

```powershell
Assert-HasFreeSpace -Disk 'C' -Percent 10
```

This is more re-usable, but makes our checks less reliable. We could again make a typo when putting it in a check and make it require 0% of free space. We don't have any way of knowing whether or not we made that typo, so there is still some room for error. But we already greatly mitigated the risk in comparison to just putting raw code in the check. We can further mitigate it by validating the range of the `-Percent` parameter, and the `-Disk` parameter.

Another way of mitigating the risk of authoring incorrect checks, is by wrapping the more general check function in a function that locks the parameters down. This is not practical for the 200 different server configs scenario we outlined on top, but it's extremely useful when you have disk `C:` that needs 10% and disk `D:` that needs 20%.

```powershell
function Assert-MyDiskCHasMoreThan10PercentOfFreeSpace {
    Assert-HasFreeSpace -Disk 'C' -Percent 10
}

function Assert-MyDiskDHasMoreThan20PercentOfFreeSpace {
    Assert-HasFreeSpace -Disk 'D' -Percent 20
}
```

This way you can re-use `Assert-HasFreeSpace` function from your environment validation toolkit, but still write extremely reliable checks, just by adding functions and two tests for those functions.

The ratio of risk vs. re-usability you allow depends on you. And it depends on the environment you are dealing with.

In my code I usually find the sweetspot when the functions are shaped like the `Assert-HasFreeSpace` function above. On the scale between raw code, and function that does just one thing, this is some 75%.

## Summary

We've been using _check function_ to refer to the function we extracted, and _check_ to refer to the test that executes it. This naming might make you think that the _check_ is more important than the _check function_, but the opposite is true.

The check function is the important part, the check (a Pester `It`) is just a convenient way of running the check function and getting a nicely colored output. We could easily rewrite the check function without using the `Should` assertion. We would then be able to run it without any dependency on Pester.

What I am trying to say here is that the real value you are producing are the check functions. It is no different from any other scripting that you do in PowerShell. Write a function and test it to make sure it works correctly. That you will later run that function via Pester is no excuse for not testing it.

Writing a pile of code in a test does not make the code correct. But apparently it makes it easier to dismiss testing the code as unnecessary, because you would be "testing your tests". Don't be that person, be proud that you test your environment validation checks.
