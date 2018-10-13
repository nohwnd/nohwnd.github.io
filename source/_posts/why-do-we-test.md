---
title: Why do we test?
date: 2015-04-29 17:26:34
tags: 
 - pester
 - powershell
 - testing
 - tdd
categories:
 - article
---

Lately we are getting some great questions on our [Pester issue page](https://github.com/pester/Pester/issues), I am reposting soem of my answers as blog posts, because I hope they are worth reading. You can access the [original question here](https://github.com/pester/Pester/issues/317).

We test because we need a simple set of boundaries that define a more complicated system. Coming up with simple tests and gradually refining them to define more complex systems is easy for us humans. Definitely easier than defining a complex system in a single swoop.

Saying that `1 + 1 = 2` is simple, we want it to be true because that is how we think the system should behave, and we can express what we want with a simple test:

```powershell
1 + 1 | Should Be 2
```

We can run the test and if it succeeds, then the system likely works as defined.

In other tests we could also define that `3 + 5 = 8`, `10 + 3 = 13` and many more. We are using other test cases to further define the expected behavior of the + operator.

Now notice one thing, every test is roughly as complex as the previous. Adding together three and five is pretty much as complicated, as adding one and one. The tests are not becoming more complex, but the system under test (in this case the + operator) is becoming more complex, because it needs to accommodate more use cases.

## Complexity

Why I am so sure that the one test case is not more complex than the other? Well, we technicians like to measure things, and so of course we can measure complexity as well, in this case we call it the cyclomatic complexity. In simple words, code has cyclomatic complexity of 1 if there is only single path through it. In such code there must not be any if or other constructs like loops or switches. Cyclomatic complexity of 1 is what we are aiming for in our test code. Such code is easy to understand, and easy to reason about because there are no `if` or `when` to distract us.

## Failing the test

Another ingredient of reliable test suite is to make the tests fail. The so called RED, GREEN, REFACTOR cycle. But failing the test just willy nilly is not enough. To demonstrate that, let’s replace our example with this test, of a function that should return ‘1’ no matter what:

```powershell
Describe "Write-One" {
  It 'Outputs 1' {
      # -- Arrange
      $expected = 1

      # -- Act
      $actual = Get-One
      
      # -- Assert
      $actual | Should Be $expected
  }
}
```

Currently it fails with `CommandNotFoundException`. Does that count as failed? No it does not! The assertion did not fail, a prerequisite of the test failed. To make it fail correctly. Add the function, make it return 200 and run the test again. Now it fails in the assertion, and you can proceed to implement the function.

## Passing the test

When the test finally succeeds, you might consider trying to alter the SUT code in a such way that makes the test fail again. If it does not fail you are probably not 100 % sure why it worked in the first place. Take some time to investigate and likely add more test.

If you do that and you write a test that succeeded on first run don’t panic, you just created a so called characterization test. Just make sure that you go back to the code and you change that one line of code that make the test (the assertion in that test!) fail. Then change your code back and run the tests again. When you perform this check, notice if you knew exactly which line to change, and how. If you did not, and you constantly have to try few lines before making the test fail, your code or your test are probably too complicated and might need a bit of improvement.

## Deterministic test

Lastly, a reliable test must be deterministic. If given the same input without changing anything else it should always fail (or succeed), but never alter between those two states. Making a test as simple as possible, and testing just a single aspect of the SUT at a time helps us achieve that. There is nothing more annoying than a test that occasionally fails and nobody knows why.

## Summary

We are writing tests, because they are simple pieces of code that we saw fail for a single reason. And we also saw them succeed. At that point we were pretty sure why they failed and why they succeeded. This little piece of trust in the code then make us trust the whole system, because if every single piece of the system works correctly, the whole system must also work correctly.
