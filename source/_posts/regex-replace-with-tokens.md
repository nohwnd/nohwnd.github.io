---
title: Regex replace with capturing groups
date: 2018-08-30 16:00
tags: 
 - code
 - editing
 - VS
 - VS Code
 - npp
categories:
 - article
---

Regular expressions with capturing groups are super useful for text replacements, and Visual Studio, VS Code, and notepad++ all support them. They can prevent you from doing a lot of boring work, such as:

<!-- more -->

```csharp
public string Name {get;set; }
```

- converting lists of items into classes
- writing the same copy code, just with the sides switched
- correcting code conventions manually
- and so much more...

## Simple example

We have this CSV file header and want to make it a full C# class.

```shell
Id Name Value ...20 more properties...
```

We could add a new line after every word, and then write in the property definition manually, which is boring, and hard when Visual Studio tries to make sense of your broken "code".

OR we can just replace every word with the correct definition, with the captured word in the middle. Something like this:

```shell
public string <the word> { get; set; }<new line>
```

Expressing this in regular expression replacement looks like this:

```shell
find:     (\w+)
replace:  public string $1 { get; set; }\n`
```

Where `$1` is replaced with the first capturing group, and `\n` is expanded to a new line.

After the replacement you get this:

```C#
public string Id { get; set; }
public string Name { get; set; }
public string Value { get; set; }
//... 20 more properties
```

All we then need to do is sorround the properties with a class defintion.

This is just a simple example, here is a full video showing other examples, and how exactly you do this: [youtube 29:20](https://youtu.be/3rPKg97ru1E?t=29m20s) with some more hardcore example: [youtube 47:39](https://youtu.be/3rPKg97ru1E?t=47m39s).


