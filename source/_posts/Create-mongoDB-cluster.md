---
title: Create mongoDB cluster
tags: 
- nosql
- mongo
date: 2016-03-27 15:34:57
---


I finished the excellent [NoSQL Distilled](http://www.amazon.com/NoSQL-Distilled-Emerging-Polyglot-Persistence/dp/0321826620) book yesterday and today I tried to start few mongo sessions and configure them as a cluster. This turned out to be a bit tedious, so I wrote a _very rough_ script for it. 
<!-- more -->
It's two main features are that it spins few instances of mongo and joins them in cluster. And it also wraps the instances in PowerShell process that puts all the output in window title, which enables you to quickly see what runs where and what's happening. 

{% gist 7de0ed814bdc0de16edb %}

{% asset_img sessions.png %} 