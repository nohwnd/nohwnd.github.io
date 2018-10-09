---
title: Axiomatic assertions
date: 2017-12-20 09:00:00
tags:
 - powershell
 - testing
 - assertions
 - pester
---

Writing a test framework is a lot of fun, and presents some unique challenges to overcome. One of them is testing your assertions. I am writing my own set of [assertions for Pester](https://github.com/nohwnd/Assert) and I also used the same ideas to test some of the `Should` assertions in Pester.

<!-- more -->

## Axiom

Proving that your assertions are correct, is a major stumbling point that you have to overcome right at the start of writing your assertion suite. To prove that your assertions are correct you need to write tests for them. To write those tests you need tested assertions. To prove that those assertions are correct you need to write tests for them. To write those tests you need tested assertions. To prove that those assertions are correct you need to write tests for them. To write those tests you need tested assertions. To prove that those assertions are correct you need to write tests for them...And so on, ad-infinitum.

This is a typical recursive situation, and as with any such situation, we need a base condition to _break out_ of the infinite recursion.

We have three options:

- Use a third-party set of assertions that are tested and believed to be correct
- Use untested code directly in our tests
- Write a custom suit of assertions

## Using a third-party set of assertions

The first option gives us a head start, we have a suite that has all the features that we need and we can start writing our assertion suite right off. This is very convenient, but we are making a trade off. Our test suite is no longer self-contained, and its correctness depends on the third-party assertions being correct.

Proving that the third-party assertions are correct is a job for their author, and he possibly did the same trade off. He reused some other suite of assertions, and those assertions might be untested, or possibly even tested with the assertions we are writing. As you can see there is a chain of trust that either terminates in not-automatically tested, or becomes recursive.

Neither of those cases proves that our assertions are correct, we always have to take someones word that his assertions are correct. At the same time it adds the complexity of multiple assertion suites, most of them having a lot of bells and whistles that we do not need, and that make them difficult to understand.

## Use untested code in tests

The second option offers no convenience, and brings us no closer to proving our code is correct. In fact it does the opposite. The more untested code we have the more uncertain we are that the code is working correctly. On the other hand there are some pros: We are now at the end of the chain of trust, and our code is self-contained.

## Write a custom suite of assertions

The third option puts us at the start of the problem. We have yet another suite of assertion to prove to be correct, which is what we are going to do. Well sort of. As we learned we cannot prove that our assertions are correct, but we can make them extremely easy to understand and test manually. Everyone can then try for themselves in under 5 minutes, and decide if they trust the building blocks of our test suite or not.

## Axiomatic assertions

Each of our new assertions is an axiom:

> An axiom is a statement that is taken to be true, to serve as a premise or starting point for further reasoning and arguments. The word comes from the Greek axíōma (ἀξίωμα) 'that which is thought worthy or fit' or 'that which commends itself as evident.'

In theory we only need a single axiomatic assertion to write all of our tests: `Verify-True`. I don't have any proof for it, but I believe that any code that you write can be expressed as a condition, result of which is then compared to $true. In practice at least `Verify-True` and `Verify-Throw` are needed to avoid making the tests unbearably awkward to write. And about eight assertions to make the test code readable and easy to follow. All of which you can [find here](https://github.com/nohwnd/Assert/tree/master/Axiom/src).

As an example let's look at the source code of `Verify-True` and `Verify-Throw`:

```powershell
function Verify-True {
    param (
        [Parameter(ValueFromPipeline=$true)]
        $Actual
    )

    if (-not $Actual) {
        throw [Exception]"Expected `$true but got '$Actual'."
    }

    $Actual
}
```

There is nothing surprising or difficult to understand. There is a single condition that throws exception when the input is not $true or truthy value such as 1. All the other assertions follow along those lines. The most complicated of them being `Verify-Throw`, which is still very simple:

```powershell
function Verify-Throw
{
    param (
        [Parameter(Mandatory=$true, ValueFromPipeline=$true)]
        [ScriptBlock]$ScriptBlock
    )

    $exceptionThrown = $false
    try {
        $null = & $ScriptBlock
    }
    catch
    {
        $exceptionThrown = $true
        $_
    }

    if (-not $exceptionThrown) {
        throw [Exception]"An exception was expected, but no exception was thrown!"
    }
}
```

Both are absolutely bare-bone implementation of the assertion. Yet they still allow to write expressive tests, that work well for our purpose, such as this one:

```powershell
Describe "Compare-ObjectEquivalent" {
    It "Given expected '<expected>' that is not an object
        it throws ArgumentException" -TestCases @(
        @{ Expected = "a" },
        @{ Expected = "1" },
        @{ Expected = { abc } },
        @{ Expected = (1,2,3) }
    ) {
        param($Expected)
        $err = { Compare-ObjectEquivalent `
                    -Actual "dummy" `
                    -Expected $Expected
               } | Verify-Throw
        $err.Exception -is [ArgumentException] | Verify-True
    }
}
```

## Summary

Testing assertions is simple if you have the right tools. Writing a second set of minimal assertions is better than not testing the assertions at all, or testing them using complicated tools that you don't control.