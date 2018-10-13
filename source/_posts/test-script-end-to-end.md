---
title: Test PowerShell Scripts End-to-end With Pester
date: 2015-01-10
tags: 
    - powershell
    - pester
    - testing
categories:
 - article
---

## End-to-end test of simple script

With Pester it is really easy to test a single PowerShell function or a library of them, but what if your script contains some code that runs those functions?

Let’s say we have a script like this one:

<!-- more -->

```powershell
# file GetSomethingScript.ps1
function Get-Something
{
  'something'
}

Get-Something
```

<!-- more -->

This script defines a function and then calls it. This is pretty normal approach if you want your script to actually do something, instead of being just a library of functions.

But see what happens if we decide to test this script using Pester:

```powershell
#file GetSomethingScript.Tests.ps1
. $PSScriptRoot\GetSomethingScript.ps1

Describe 'Get-Something' {
  It 'Gets something' {
      Get-Something | Should Be 'something'
  }
}
```

And run the test code:

{% asset_img runtwice.png %}

As you can see the `Get-Something` function was run before running the tests as well. This is because we are dot-sourcing the tested script which means running it in the current scope (Using Dot Source Notation with Scope.). This is not good because the script should not run at this time.

So we need a way to dot source the script without running the `Get-Something` function. To do that we check the value of `$MyInvocation.InvocationName` as such:

```powershell
#file GetSomethingScript.Tests.ps1
function Get-Something
{
  'something'
}

if ($MyInvocation.InvocationName -ne '.')
{
    Get-Something
}
```

That condition makes sure the script imports properly when dot sourced, and that it runs properly when invoked by the user from PowerShell console or PowerShell ISE.

Now you might be tempted to check if that worked with tests that go like this:

```powershell
#file GetSomethingScript.Tests.ps1
$scriptPath = "$PSScriptRoot\GetSomethingScript.ps1"
. $scriptPath

Describe 'Get-Something' {
  It 'Gets something' {
        Get-Something | Should Be 'something'
  }
}

Describe 'GetSomethingScript.ps1' {
    Mock Get-Something {}
    It 'Runs the entry point function when invoked normally' {
        &$scriptPath | Should Be  'something'
    }

    It 'Does not run the entry point function when dot sourced' {
        . $scriptPath
        Assert-MockCalled Get-Something -Exactly 0 -Scope It
    }
}
```

And on the first look it might seem to work correctly, but the second test is not proving anything. Dot sourcing the script inside the `It` block **redefines** the `Get-Something` function which makes it invisible for Mocking. So even if the function was called hundred times you’d still get green result. Checking for 0 calls with Mocking is always tricky.

Let’s prove that I am right by calling the `Get-Something` function before `Assert-MockCalled` which should make the `It` fail. We also save the result, which should be empty as defined by the Mock, and check that as well.

```powershell
#file GetSomethingScript.Tests.ps1
$scriptPath = "$PSScriptRoot\GetSomethingScript.ps1"
. $scriptPath

Describe 'Get-Something' {
  It 'Gets something' {
        Get-Something | Should Be 'something'
  }
}

Describe 'GetSomethingScript.ps1' {
    Mock Get-Something {}
    It 'Runs the entry point function when invoked normally' {
        &$scriptPath | Should Be  'something'

    }

    It 'Does not run the entry point function when dot sourced' {
        . $scriptPath
        #call the function before mock and save the result
        $result = Get-Something
        Assert-MockCalled Get-Something -Exactly 0 -Scope It
        $result | Should BeNullOrEmpty
    }
}
```

This puts us in a weird situation, we have code in our script that we are unable to test. Unfortunately there is no simple solution for this at the moment.

## How about more complicated scripts?

Another problem you might face is that you want to check if the entry-point function of your script is run, but you don’t want to run the whole script to do that. The reason might simply be that the script takes too long to run.

Your knee-jerk reaction to this might be writing a test like this one:

```powershell
#file GetSomethingScript.Tests.ps1
$scriptPath = "$PSScriptRoot\GetSomethingScript.ps1"
. $scriptPath

Describe 'GetSomethingScript.ps1' {
    Mock Get-Something {}
    It 'Runs the entry point function when invoked normally' {
        &$scriptPath
        Assert-MockCalled Get-Something -Exactly 1 -Scope It
    }
}
```

But unfortunately that won’t work because invoking the script with & starts it in another scope where, Mocking can’t see it.

To run it in the current scope you could use dot sourcing, but as we learned earlier dot sourcing the script inside the It block redefines the Get-Something function which makes it invisible for Mocking. Not to mention you now have to find a different mechanism to solve the first (dot sourcing the script to Pester) problem.

Unfortunately there is no elegant way around it at the moment so the low-tech and frankly horrible solution I use is regexing the last lines of the script:

```powershell 
#file GetSomethingScript.Tests.ps1
$scriptPath = "$PSScriptRoot\GetSomethingScript.ps1"
. $scriptPath

Describe 'GetSomethingScript.ps1' {
    Mock Get-Something {}
    It 'Runs the entry point function when invoked normally' {
        $content = Get-Content -Path $scriptPath -Tail 4 -ReadCount 4

        -join $content -replace '\s' |
        Should Match ([regex]::Escape('if($MyInvocation.InvocationName-ne''.''){Get-Something}'))
    }
}
```

It gets job done, and actually works pretty well, but a better solution is definitely needed.

### Different approach

There is also a different approach to the whole problem, that Dave Wyatt suggested when I talked with him about the dot sourcing problem few months ago: Provide a parameter that is used only by Pester.

I don’t like it much because I believe the script should not expose anything test framework specific. But I will use that approach to show what is needed to actually test all those cases properly.

First here is a basic check if the script is being dot sourced, we just add and use the $UnderTest parameter instead of $MyInvocation.InvocationName:

```powershell
#file GetSomethingScript.ps1
param (
    [switch]$UnderTest
)

function Get-Something
{
  'something'
}

if (-not $UnderTest)
{
   Get-Something
}

#file GetSomethingScript.Tests.ps1
$scriptPath = "$PSScriptRoot\GetSomethingScript.ps1"
#do not forget to set the UnderTest parameter here
. $scriptPath -UnderTest

Describe 'Get-Something' {
  It 'Gets something' {
        Get-Something | Should Be 'something'
  }
}
```

This again gives you the power to stop the Get-Something from running when dot sourced, but still you can’t test that. And you can’t test if main entry point is run (when the script is invoked normally) either.

What would be actually needed is something like this:

```powershell
#file GetSomethingScript.ps1
param (
    [switch]$UnderTest,
    [switch]$EntrypointTest,
    [switch]$DotsourcingTest
)

#when dot sourcing is tested do not redifine the Main function
#to keep Mocking work
if (-not $DotsourcingTest) {
    function Main
    {
      #user defined code
        Get-Something
    }
}

#all user defined functions
function Get-Something {
    'something'
}

if (-not $UnderTest)
{
    #when entrypoint is tested redefine the function to 
    #return dummy value
    if ($EntrypointTest) {
        function Main
        {
            '___Pester_Test_Value'
        }
    }

    Main
}

#file GetSomethingScript.Tests.ps1
$scriptPath = "$PSScriptRoot\GetSomethingScript.ps1"
. $scriptPath -UnderTest

Describe 'Get-Something' {
  It 'Gets something' {
        Get-Something | Should Be 'something'
  }
}

Describe 'GetSomethingScript.ps1' {
    Mock Main {'mock'}
    It 'Runs the entry point function when invoked normally' {
       &$scriptPath -entrypointTest | Should Be '___Pester_test_value'
    }

    It 'Does not run the entry point function when tested' {
        . $scriptPath -UnderTest -dotsourcingTest

        Assert-MockCalled Main -Exactly 0 -Scope It
        Main | Should Be 'mock'
    }

    #you would not put this in production
    #because that is the problem we are trying to solve
    It 'Can actually run normally' {
       &$scriptPath | Should Be 'something'
    }
}
```

But of course we can’t require Pester users to put all this logic in their scripts. Another way to do this would be to AST the script, make a backup copy of it and inject those definitions in, but I am reluctant to edit the tested script in any way.

BTW: `$MyInvocation.InvocationName` works flawelessly in ISE and Console, but it does not work in PowerGUI because it dot sources all scripts when running them, so as a result you won’t be able to run your scripts in PowerGUI.