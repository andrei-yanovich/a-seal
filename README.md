# A Seal

Access Control List (ACL) library for Node.JS

<img src="mark-spencer.jpg" width="800">

## Install
```
npm install a-seal
```

## Usage

```javascript

//create an acl instance
var acl = require('a-seal')();

//Compose rules of a 'resource', 'actions' and 'roles' using...
//`match`, `for` and `thenAllow` respectively:
acl.match('/protected-path').for('GET').thenAllow('user');
acl.match('/protected-path').for('GET', 'POST').thenAllow('admin');

//use `isAllowed(role, resource, action)` to determine if a request is allowed to access the resource with a given action:
acl.isAllowed('admin', '/protected-path', 'POST') //true
acl.isAllowed('user', '/protected-path', 'POST') //false

//A Seal creates a white-list of rules, so:
acl.isAllowed('admin', '/protected-path', 'DELETE') //false
```

### Middleware

A Seal can be used as Express middleware to authorize requests after authentication:

```javascript
app.use(function(req, res. next) {    
    req.user = {
        role: 'anon'
    };
    next();
});

var acl = require('a-seal')();
acl.match('/protected-path').for('GET').thenAllow('user');
acl.match('/protected-path').for('GET', 'POST').thenAllow('admin');

app.use(acl.middleware());

app.use('/protected-path', function(req, res, next) {
    res.send('<p>Authorized ok</p>');
});

app.use(function(err, req, res) {
    if(err.status === 403) {
        //authorization failure
    }
});
```

## API

### match(resource)

Begins a matching context given a resource to match. If the resource is a string, an exact, case-sensitive 
match is performed.

Returns: `object` (matchingContext)

#### Params
##### resource

Type: `string` | `RegExp`

#### Examples:

```javascript
acl.match('/my-path') //exact string match
acl.match(/^\/my-path/) //match with regex (starting with /my-path)
```

### matchingContext.for(actions)

Completes a matching context by adding one or more actions. When authorizing HTTP requests, for example, actions will 
typically be HTTP methods.

Returns `object` (matchingContext)

#### Params
##### actions

Type: `...string` | `Array`

A list of actions as an array of strings or a list of strings as arguments.

#### Examples

```javascript
acl.match('/my-path').for(['GET', 'POST' ]);
acl.match('/my-path').for('GET', 'POST');
acl.match('/my-path').for(...myActions);
```

### matchingContext.thenAllow(roles)

Adds a new ACL rule by adding one or more roles to a matching context.

Returns: acl instance

#### Params
##### roles

Type: `...string` | `Array`

A list of roles as an array of strings or a list of strings as arguments.

#### Examples

```javascript
acl.match('/my-path').for('GET').thenAllow([ 'user', 'anon' ]);
acl.match('/my-path').for('GET').thenAllow('user', 'anon');
acl.match('/my-path').for('GET').thenAllow(...myRoles);
```

### isAllowed(role, resource, action)

Determines if a given role is authorized to access a given resource with a given action.

#### Params
##### role

Type: `string`

##### resource 

Type: `string`

##### action

Type: `string`

#### Examples:

```javascript
acl.isAllowed('admin', '/my-path', 'GET');
```

## License

MIT © Phil Mander
