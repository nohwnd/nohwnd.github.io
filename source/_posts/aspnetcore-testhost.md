---
title: Testing Giraffe with Microsoft.AspNetCore.TestHost
date: 2019-04-07 18:00:00
tags: 
 - fsharp
 - csharp
 - C# 
 - .NET Core
 - ASP.NET Core
categories:
 - article
---
 
Last week I started a project in F#. In the F# project we are using [Giraffe](https://github.com/giraffe-fsharp/Giraffe) for the backend and we are testing it with [Microsoft.AspNetCore.TestHost](https://docs.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-2.2). This test host allows your ASP.NET Core app to run and be queried, just like it normally would, but with one instance per test and with doing everything in memory. This is great for integration tests, because with a very simple setup you can test your routing, validation, permissions, http return codes, serialization and so on. A lot of stuff that your might otherwise find difficult to test. 

<!-- more -->

A typical setup in C# would look like this: 

```csharp
public class UnitTest1
{
    [Fact]
    public async Task GetsOkOnRoot()
    {
        // -- Arrange
        var webBuilder = new WebHostBuilder()
            .UseStartup<WebApplication1.Startup>();
        
        var testServer = new TestServer(webBuilder);

        var client = testServer.CreateClient();
        
        // -- Act
        var response = await client.GetAsync("/");

        // -- Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
```

The `WebHostBuilder` points to `Startup` class in your web app project. Based on a naming convention the builder looks up for `Configure` and `ConfigureServices` methods on this class an uses them to start your application.

In F# with Giraffe the setup is very similar, but there is no `Startup` class, but luckily we can give the builder the callbacks to `ConfigureServices` and `Configure` directly. 

This is how it's done: 

```fsharp
[<Fact>]
let ``My test`` () =
    task {
        // -- Arrange
        let webBuilder =
            WebHostBuilder()
                .ConfigureServices(App.configureServices)
                .Configure(Action<IApplicationBuilder> App.configureApp)
        
        let testServer = new TestServer(webBuilder)
            
        let client = testServer.CreateClient()
        
        // -- Act
        let! response = client.GetAsync "/"
        
        // -- Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode)
    }
```

The change is at the start of the `webBuilder`, we point the builder to the appropriate functions in our web app (and hint the type of `configureApp` to the compiler). 

Running the test proves that it works.

For completeness here is the server code listing: 

```fsharp
module GiraffeWebApp.App

open System
open Microsoft.AspNetCore.Builder
open Microsoft.AspNetCore.Hosting
open Microsoft.Extensions.DependencyInjection
open Giraffe

let webApp =
    choose [
        GET >=>
            choose [
                route "/" >=> text "hello"
            ]
        setStatusCode 404 >=> text "Not Found" ]

let configureServices (services : IServiceCollection) =
    services.AddGiraffe() |> ignore

let configureApp (app : IApplicationBuilder) =
    app.UseGiraffe(webApp)

[<EntryPoint>]
let main _ =
    WebHostBuilder()
        .UseKestrel()
        .UseIISIntegration()
        .ConfigureServices(configureServices)
        .Configure(Action<IApplicationBuilder> configureApp)
        .Build()
        .Run()
    0
```

## Okay what's the big deal? 

All of this looks just like an implementation detail, we simply need to do a bit more work in F# than in C#, but it's not just that. In F# we can leverage partial application to provide test configuration in a hard-typed way, while keeping the application really strict about it's config in production.

For example we have email configuration and we want to change it when running in a test. The configuration is loaded from environment variables e.g. `EMAIL_ADDRESS`.

Changing the configuration between test and production can be done for example like this: 

```fsharp
// in App
type EmailOptions =
    {
        Email : string
    }
    
let webApp =
    choose [
        GET >=>
            choose [
                route "/" >=>
                    fun  next (ctx:HttpContext) ->
                        let o = ctx.GetService<EmailOptions>()
                        Successful.OK o.Email next ctx    
            ]
        setStatusCode 404 >=> text "Not Found" ]

let emailOptions = {
    Email = Environment.GetEnvironmentVariable("EMAIL_ADDRESS")
}

let configureServices (services : IServiceCollection) =
    services.AddSingleton(emailOptions) |> ignore
    services.AddGiraffe() |> ignore

let configureApp (app : IApplicationBuilder) =
    app.UseGiraffe(webApp)


// in test 
[<Fact>]
let ``My test`` () =
    task {
        // -- Arrange
        let emailOptions = { Email = "me@company.com" } 
        let webBuilder =
            WebHostBuilder()
                .ConfigureServices(App.configureServices)
                .ConfigureServices(fun s -> s.AddSingleton(emailOptions) |> ignore)
                .Configure(Action<IApplicationBuilder> App.configureApp)
        
        let testServer = new TestServer(webBuilder)
            
        let client = testServer.CreateClient()
        
        // -- Act
        let! response = client.GetAsync "/"
        
        // -- Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode)
        let! content = response.Content.ReadAsStringAsync()
        Assert.Equal("\"me@company.com\"", content)
    }
```

We define a new type for email options and load them from environment variables into a record. 

Inside of the test, we also register a new singleton of type EmailOptions, this time with the testing data. This will effectively hide the options that we loaded in the production code and will allow the test to pass, because the record we provided in test is used. 

This is quite cool, and powerful but full of implicit knowledge. 

## A better way? 

A better way to structure this is to make the dependencies for the builder explicit. That way we can directly provide the dependencies via parameters. 

```fsharp
// in App
let emailOptions = {
    Email = Environment.GetEnvironmentVariable("EMAIL_ADDRESS")
}

let configureServices (emailOptions : EmailOptions) (services : IServiceCollection) =
    services.AddSingleton(emailOptions) |> ignore
    services.AddGiraffe() |> ignore

let configureApp (app : IApplicationBuilder) =
    app.UseGiraffe(webApp)

[<EntryPoint>]
let main _ =
    WebHostBuilder()
        .UseKestrel()
        .UseIISIntegration()
        .ConfigureServices(configureServices emailOptions)
        .Configure(Action<IApplicationBuilder> configureApp)
        .Build()
        .Run()
    0

// in Test
[<Fact>]
let ``My test`` () =
    task {
        // -- Arrange
        let emailOptions = { Email = "me@company.com" } 
        let webBuilder =
            WebHostBuilder()
                .ConfigureServices(App.configureServices emailOptions)
                .Configure(Action<IApplicationBuilder> App.configureApp)
        
        let testServer = new TestServer(webBuilder)
            
        let client = testServer.CreateClient()
        
        // -- Act
        let! response = client.GetAsync "/"
        
        // -- Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode)
        let! content = response.Content.ReadAsStringAsync()
        Assert.Equal("\"me@company.com\"", content)
    }

```

In the application we added a new parameter to `configureServices` that explicitly asks for `emailOptions` and then we used it in the `main` function at the bottom of the startup code. 

In the test we removed the `AddSingleton` call that was shadowing the registration we did in the App, and instead we are partially applying testing `emailOptions` to the `App.configureServices`. 

## Is it worth it? 

In my opinion it totally is. You are stating your dependencies explicitly. You run into fewer bugs because you do not forget to provide a testing configuration for some dependency. It is also much nicer to work with strongly typed records than with non-typed strings. And in case you are running your tests in parallel you don't have to worry about your configuration bleeding into other tests.

> _Side note_: The examples above are very simplistic, in case I was doing just that I would probably do it in a way that [Scott Wlaschin](https://fsharpforfunandprofit.com/posts/dependency-injection-1/) recommends here. When there is only configuraion that can be easily provided via environment variables that method is just much simpler. Unfortunately it cannot be applied to passing behavior rather than just options. Say we have a mailing "service" that either sends mails, or just collects them in memory (in a test). That service cannot be injected into the program during tests via environment variables, for that we need a proper abstraction. Another examples where you need to replace behavior but not config might be using in-memory database provider for testing, stable time provider or similar. In all of those cases you might add the testing dependencies to your application, and use configuration to enable/disable the testing behavior, but that is a bad idea.








