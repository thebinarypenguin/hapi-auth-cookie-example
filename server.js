var CookieAuth = require('hapi-auth-cookie');
var Handlebars = require('handlebars');
var Hapi       = require('hapi');
var Path       = require('path');
var Vision     = require('vision');
var Pkg        = require('./package.json');

// Create a hapi server
var server = new Hapi.Server();

// Add an incoming connection to listen on
server.connection({
  host: 'localhost',
  port: 3000,
  router: {
    stripTrailingSlash: true,
  }
});

// Register plugins
server.register([
  CookieAuth,
  Vision,
], function(err) {
  if (err) { throw err; }

  // Register an authentication strategy named "session" which uses the "cookie" scheme.
  // The "cookie" authentication scheme is provided by the "hapi-auth-cookie" plugin.
  server.auth.strategy(
    'session',
    'cookie',
    {
      cookie: 'example',
      password: 'secret',
      isSecure: false, // For development only
      redirectTo: '/login',
      redirectOnTry: false,
      appendNext: 'redirect',
    }
  );

  // Configure template rendering.
  // The "views" method is provided by the "vision" plugin.
  server.views({
    engines: {
      html: Handlebars,
    },
    path: Path.join(__dirname, 'templates'),
    layout: 'layout',
  });

  // Register a route to show the "Home" page (no authentication required)
  server.route({
    method: 'GET',
    path: '/',
    config: {
      auth: {
        mode: 'try',
        strategy: 'session',
      }
    },
    handler: function(request, reply) {
      var context = {
        session: {},
      };

      if (request.auth.isAuthenticated) {
        context.session = request.auth.credentials;
      }

      reply.view('home', context);
    }
  });

  // Register a route to show the "Public" page (no authentication required)
  server.route({
    method: 'GET',
    path: '/public',
    config: {
      auth: {
        mode: 'try',
        strategy: 'session',
      }
    },
    handler: function(request, reply) {
      var context = {
        session: {},
      };

      if (request.auth.isAuthenticated) {
        context.session = request.auth.credentials;
      }

      reply.view('public', context);
    }
  });

  // Register a route to show the "Private" page (client must have a valid session).
  // If the client does not have a valid session it will be redirected to the "Login" page.
  server.route({
    method: 'GET',
    path: '/private',
    config: {
      auth: {
        mode: 'required',
        strategy: 'session',
      }
    },
    handler: function(request, reply) {
      var context = {
        session: request.auth.credentials,
      };

      reply.view('private', context);
    }
  });

  // Register a route to show the the "Login" page.
  // If the client already has a valid session it will be redirected to another page.
  server.route({
    method: 'GET',
    path: '/login',
    config: {
      auth: {
        mode: 'try',
        strategy: 'session',
      }
    },
    handler: function(request, reply) {
      var redirectPath = request.query.redirect || '/';
      var context = {
        session: {},
      };

      if (request.auth.isAuthenticated) {
        return reply.redirect(redirectPath);
      }

      reply.view('login', context);
    }
  });

  // Register a route to process the login credentials.
  // If the credentials are valid, create a session and redirect the client to another page.
  // If the credentials are invalid, show the login page and an error message.
  server.route({
    method: 'POST',
    path: '/login',
    config: {
      auth: {
        mode: 'try',
        strategy: 'session',
      }
    },
    handler: function(request, reply) {
      var redirectPath = request.query.redirect || '/';
      var context = {
        session: {},
      };

      if (request.auth.isAuthenticated) {
        return reply.redirect(redirectPath);
      }

      if (request.payload.username === 'admin' && request.payload.password === 'password') {
        request.auth.session.set({ username: request.payload.username });
        return reply.redirect(redirectPath);
      }

      context.err = 'Invalid Credentials';
      reply.view('login', context);
    }
  });

  // Register a route to destroy any existing session and redirect the client to the home page.
  server.route({
    method: 'GET',
    path: '/logout',
    config: {
      auth: {
        mode: 'try',
        strategy: 'session',
      }
    },
    handler: function(request, reply) {
      request.auth.session.clear();
      reply.redirect('/');
    }
  });

  // Start listening for requests
  server.start(function() {
    console.log(Pkg.name + '@' + Pkg.version + ' is running at ' + server.info.uri);
  });
});