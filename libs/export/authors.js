/**
 * External module Dependencies.
 */
var mkdirp    = require('mkdirp'),
    path      = require('path'),
    _         = require('lodash'),
    fs = require('fs'),
    parseString = require('xml2js').parseString,
    when      = require('when');

/**
 * Internal module Dependencies.
 */
var helper = require('../../libs/utils/helper.js');


var authorConfig = config.modules.authors,
    authorsFolderPath = path.resolve(config.data,config.entryfolder, authorConfig.dirName),
    masterFolderPath = path.resolve(config.data, 'master',config.entryfolder);

/**
 * Create folders and files if they are not created
 */
if (!fs.existsSync(authorsFolderPath)) {
    mkdirp.sync(authorsFolderPath);
    helper.writeFile(path.join(authorsFolderPath, authorConfig.fileName))
    mkdirp.sync(masterFolderPath);
    helper.writeFile(path.join(masterFolderPath, authorConfig.masterfile), '{"en-us":{}}')
}

function ExtractAuthors(){
    if (!fs.existsSync(path.join(config.data, config.json_filename))) {
        var xml_data = helper.readXMLFile(config.xml_filename)
        parseString(xml_data, {explicitArray: false}, function (err, result) {
            if (err) {
                errorLogger('failed to parse xml: ', err);
            } else {
                helper.writeFile(path.join(config.data, config.json_filename), JSON.stringify(result, null, 4))
            }
        })
    }
}

ExtractAuthors.prototype = {
    putAuthors: function(authordetails){
        return when.promise(function(resolve, reject) {
            var slugRegExp = new RegExp("[^a-z0-9_-]+", "g");
            var authordata = helper.readFile(path.join(authorsFolderPath, authorConfig.fileName));
            var authormaster =helper.readFile(path.join(masterFolderPath, authorConfig.masterfile))
            var ids=[]
            authordetails.map(function (data, index) {
                var title = data["wp:author_login"];
                var url="/author/"+title.toLowerCase().replace(slugRegExp, '-');
                authordata[title] = {"title": title, "url": url,"email":data["wp:author_email"], "first_name":data["wp:author_first_name"], "last_name":data["wp:author_last_name"]}
                authormaster["en-us"][title]=""
                successLogger("axported author " +"'"+title+"'");
            })
            helper.writeFile(path.join(authorsFolderPath, authorConfig.fileName), JSON.stringify(authordata, null, 4))
            helper.writeFile(path.join(masterFolderPath, authorConfig.masterfile), JSON.stringify(authormaster, null, 4))
            resolve();
        })
    },
    getAllAuthors: function(){
        var self = this;
        return when.promise(function(resolve, reject){
            var alldata=helper.readFile(path.join(config.data, config.json_filename))
            var authors = alldata.rss.channel['wp:author'];
            if(authors) {
                if (authors.length > 0) {
                    self.putAuthors(authors)
                    resolve()
                } else {
                    errorLogger("no authors found");
                    resolve()
                }
            }else{
                errorLogger("no authors found");
                resolve()
            }
        })
    },
    start :function() {
        successLogger("exporting authors...");
        var self = this;
        return when.promise(function(resolve, reject) {
            self.getAllAuthors()
            resolve()
        })

    }
}



module.exports = ExtractAuthors;