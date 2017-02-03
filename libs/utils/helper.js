/**
 * External module Dependencies.
 */
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');


/**
 * Internal module Dependencies.
 */

exports.readXMLFile = function(filePath){
    var data;
    if(fs.existsSync(filePath))
     data=fs.readFileSync(filePath, 'utf-8')

    return data
};

exports.readFile = function(filePath, parse){
    parse = (typeof parse == 'undefined') ? true : parse;
    filePath = path.resolve(filePath);
    var data;
    if(fs.existsSync(filePath))
        data = (parse) ? JSON.parse(fs.readFileSync(filePath, 'utf-8')) : data;
    return data;
};

exports.writeFile = function(filePath, data){
    filePath = path.resolve(filePath);
    data = (typeof data == 'object') ? JSON.stringify(data) : data || "{}";
    fs.writeFileSync(filePath, data, 'utf-8');
};

exports.appendFile = function(filePath, data){
    filePath = path.resolve(filePath);
    fs.appendFileSync(filePath, data);
};

exports.makeDirectory = function(){
    for(var key in arguments){
        var dirname = path.resolve(arguments[key]);
        if(!fs.existsSync(dirname))
            mkdirp.sync(dirname);
    }
};

