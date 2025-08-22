---
title: Running .NET on s390x with BigEndian
date: 2025-08-22 19:00
tags: 
 - dotnet
 - .NET
categories:
 - article
---

I wanted to test some big-endian code in .NET, for Guid generation. This is how I got .NET 8 working on s390x emulated system via docker on Windows.

<!-- more -->

For [this](https://github.com/microsoft/testfx/pull/5974) change in MSTest, we wanted to properly comply with the UUID spec, and set the GUID to version 8, and embed some of our data. Combining this with XxHash128 non-cryptographic hash coming from System.Hashing.IO, gives us better performance than the outdated SHA1 cryptographic hash.

One thing we were not sure about was the impact on system endianness on the data that Guid is made from, and after a while of thinking about it my brain was cooking. So rather than guessing I wanted to try it live.

I found multiple outdated solutions, and even setup Ubuntu in VM to try this. But it turns out to be as simple as this:

```sh
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
docker run --platform linux/s390x --rm -it registry.access.redhat.com/ubi8/dotnet-90 bash
```

This command will download the image, start the image in interactive mode, and you should be able to run `uname -a` to see that s390x architecture is used:

```sh
bash-4.4$ uname -a
Linux 1c1a6e356d4d 5.15.153.1-microsoft-standard-WSL2 #1 SMP Fri Mar 29 23:14:13 UTC 2024 s390x s390x s390x GNU/Linux
```

All that is then needed is writing a program, and compiling it:

```
mkdir console1
cd console1
dotnet new console

dotnet run 
```

## Developing

To develop further, and compare the code running locally and in the emulator, I've found it easiest to simply create the project on Windows, and open and debug in VS. Then map the same code via volume into docker and use run it there to compare the behavior. I also don't use the `--rm` parameter here, so my container does not self-destruct on stop.

```sh
docker run --platform linux/s390x -v C:\source\myproject:/mnt/myproject -it registry.access.redhat.com/ubi8/dotnet-90 bash
```

And then in docker:

```sh
cd /mnt/myproject

dotnet run
```

## What did not work

In other guides, such as this one `https://docs.gitlab.com/omnibus/development/s390x/`, we can find this command:

```sh
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
docker run --rm -it s390x/ubuntu bash
```

The first command is correct, but the second one does not tell docker correctly which platform you want to use for this multi-architecure image. Ending with error:

```sh
docker run --rm -it s390x/ubuntu bash
Unable to find image 's390x/ubuntu:latest' locally
latest: Pulling from s390x/ubuntu
docker: no matching manifest for linux/amd64 in the manifest list entries
```

## Running via QEMU directly

Following [this video](https://www.youtube.com/watch?v=tmcsvafVJG4&t=10s), and the linked code, I was able to setup QEMU in WSL and run a distro through it, but no matter what I did I was not able to login via SSH. This is a possible route if you want to do it, but for my purpose it was overly complicated.
