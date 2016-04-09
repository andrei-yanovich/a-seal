var Acl = function() {
    this._rules = [];
};

var defaultExport = function() {
    return new Acl();
};

defaultExport.middleware = function(acl) {
    return function(req, res, next) {
        var isAllowed = false;
        var err;
        if(req.user && req.user.role) {
            isAllowed = acl.isAllowed(req.user.role, req.pathname, req.method);
            if(isAllowed) {
                return next();
            } else {
                err = new Error('User is not authorized');
                err.status = 403;
            }
        } else {
            err = new Error('User must authenticate');
            err.status = 401;
        }
        return next(err);
    };
};

module.exports = defaultExport;

/**
 * Add a new rule, starting with the resource + action to match
 * @param resource
 * @param actions
 * @returns {{thenOnlyAllow: thenOnlyAllow}}
 */
Acl.prototype.match = function(resource, actions) {

    //normalize
    if(typeof actions === 'string') {
        actions = [ actions ];
    }
    if(typeof resource === 'string') {
        resource = new RegExp('^' + resource.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + '$');
    }
    
    //validate
    if(!Array.isArray(actions)) {
        throw new Error('Cannot do acl match, actions must be a string or array, but were: ' + typeof actions);
    }
    if(!(resource instanceof RegExp)) {
        throw new Error('Cannot do acl match, resources must be a string or regex');
    }

    return {
        thenAllow: function(roles) {
            //normalize
            if(typeof roles === 'string') {
                roles = [ roles ];
            }
            //validate
            if(!Array.isArray(roles)) {
                throw new Error('Cannot add acl rule, roles must be a string or array, but were: ' + typeof roles);
            }
            
            //find existing rule
            var rule = this._rules.filter(function (rule) {
                return rule.resource.source === resource.source && 
                       rule.actions.sort().toString() === actions.sort().toString();
            })[0] || { _new: true };

            //create or update
            rule.resource = resource;
            rule.actions = actions;
            rule.roles = roles;

            //add if new
            if(rule._new) {
                delete rule._new;
                this._rules.push(rule);
            }

            return rule;
        }.bind(this)
    };
};

/**
 * Loops through the acls in order added looking for a resource pattern match.
 * Grants permission if the role is found
 * @param role
 * @param resource
 * @param action
 * @returns {boolean}
 */
Acl.prototype.isAllowed = function(role, resource, action) {

    //check args
    var argNames = [ 'role', 'resource', 'action'];
    for(i = 0; i < argNames.length; i++) {
        if(typeof arguments[i] !== 'string') {
            throw new Error('Can\'t check permission with this ' + argNames[i] + 
                            '. It should be a string, but it is a: ' + typeof argNames[i]);
        }    
    }
    
    //test rules in reverse order. last defined have highest priority
    var i, rule;
    for(i = this._rules.length - 1; i >= 0; i--) {
        rule = this._rules[i];

        //test if regex
        var matchResource = rule.resource.test(resource);

        //string star will match any otherwise find match in actions array
        var matchAction = action === '*' || rule.actions.indexOf(action) > -1;

        //if the resource + action is match then allow or deny, given the role
        if(matchResource && matchAction) {
            var matchRole = rule.roles.indexOf('*') > -1 || rule.roles.indexOf(role) > -1;
            return matchRole;
        }
    }

    //deny by default
    return false;
};

/**
 * Serializes this ACL instance
 */
Acl.prototype.toJSON = function() {

    //temp patch regex tojson method
    var orignalRegexToJson = RegExp.prototype.toJSON;
    RegExp.prototype.toJSON = RegExp.prototype.toString;

    var serialized = JSON.stringify(this._rules);
    RegExp.prototype.toJSON = orignalRegexToJson;
    return serialized;
};

/**
 * Deserializes from JSON that was generated by toJSON
 * @param rules
 */
Acl.prototype.fromJSON = function(rules) {
    
    rules = JSON.parse(rules);

    var isRegexPattern = new RegExp('^\/(.*)\/$');
    rules = rules.map(function (rule) {
        var regex = isRegexPattern.exec(rule.resource);
        rule.resource = new RegExp(regex[1]);
        return rule;
    });

    this._rules = rules;
};