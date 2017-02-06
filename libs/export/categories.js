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

var categoryConfig = config.modules.categories,
    categoryFolderPath = path.resolve(config.data,config.entryfolder,categoryConfig.dirName),
    masterFolderPath = path.resolve(config.data, 'master',config.entryfolder);

/**
 * Create folders and files
 */
if (!fs.existsSync(categoryFolderPath)) {
    mkdirp.sync(categoryFolderPath);
    helper.writeFile(path.join(categoryFolderPath, categoryConfig.fileName))
    mkdirp.sync(masterFolderPath);
    helper.writeFile(path.join(masterFolderPath, categoryConfig.masterfile), '{"en-us":{}}')
}



function ExtractCategories(){
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

ExtractCategories.prototype = {
    putCategories: function(categorydetails){
        return when.promise(function(resolve, reject) {
            var slugRegExp = new RegExp("[^a-z0-9_-]+", "g");
            var categorydata = helper.readFile(path.join(categoryFolderPath, categoryConfig.fileName));
            var categorymaster =helper.readFile(path.join(masterFolderPath, categoryConfig.masterfile));
            categorydetails.map(function (data, index) {
                var title = data['title'];
                title=title.replace(/&amp;/g, '&')
                var description=data['description']
                if(description){
                    description=description.replace(/&amp;/g, '&')
                }
                var parent=data['parent'] || "";
                var url = "/category/" + data["nicename"].toLowerCase().replace(slugRegExp, '-');
                categorydata[data["nicename"]] = {"title": title, "url": url, description:description ,parent:[parent]}
                categorymaster["en-us"][data["nicename"]]=""
                successLogger("exported category " +"'"+title+"'")
            })
            helper.writeFile(path.join(categoryFolderPath, categoryConfig.fileName), JSON.stringify(categorydata, null, 4))
            helper.writeFile(path.join(masterFolderPath, categoryConfig.masterfile), JSON.stringify(categorymaster, null, 4))
            resolve();
        })
    },
    getAllCategories: function(){
        var self = this;
        return when.promise(function(resolve, reject){
            var categorisname;
            if(ids){
                categorisname=ids;
            }
            if(categorisname) {
                categorisname = categorisname.substring(1, categorisname.length - 1);
                categorisname = categorisname.split(",");
            }
            var alldata=helper.readFile(path.join(config.data, config.json_filename));
            var categories=alldata.rss.channel['wp:category'];
            var posts = alldata.rss.channel['item'];
            var categoriesArrray = [];
            if(categories && categories.length>0){
                categories.map(function (categoryinfo, instanceIndex) {
                    if(categorisname && categorisname.length>0) {
                        if ((categorisname.indexOf(categoryinfo["wp:category_nicename"])) != -1) {
                            categoriesArrray.push({title:categoryinfo['wp:cat_name'],nicename:categoryinfo['wp:category_nicename'],description:categoryinfo['wp:category_description'],parent:categoryinfo['wp:category_parent']})
                        }
                    }else{
                        categoriesArrray.push({title:categoryinfo['wp:cat_name'],nicename:categoryinfo['wp:category_nicename'],description:categoryinfo['wp:category_description'],parent:categoryinfo['wp:category_parent']})
                        }

                })
                if (categoriesArrray.length > 0) {
                    self.putCategories(categoriesArrray)
                    resolve()
                } else {
                    errorLogger("no categories found");
                    resolve()
                }
            }else if(posts) {
                posts.map(function (post, instanceIndex) {
                    if (post["wp:post_type"] == "post") {
                        if (post["wp:status"] == "publish") {
                            var categories = post["category"];
                            if(Array.isArray(categories)){
                                categories.map(function (category, instanceIndex) {
                                    if (category["$"]["domain"] == "category"){
                                        if(categorisname && categorisname.length>0){
                                            if((categorisname.indexOf(category["$"]["nicename"]))!=-1){
                                                categoriesArrray.push({title:category["_"],nicename:category["$"]["nicename"]})
                                            }
                                        }else{
                                            categoriesArrray.push({title:category["_"],nicename:category["$"]["nicename"]})
                                        }
                                    }
                                })
                            }else{
                                if(categories["$"]["domain"] == "category"){
                                    if(categorisname && categorisname.length>0){
                                        if((categorisname.indexOf(categories["$"]["nicename"]))!=-1){
                                            categoriesArrray.push({title:categories["_"],nicename:categories["$"]["nicename"]})
                                        }
                                    }else{
                                        categoriesArrray.push({title:categories["_"],nicename:categories["$"]["nicename"]})
                                    }

                                }
                            }
                        }
                    }
                })
                categoriesArrray = _.uniqBy(categoriesArrray, 'nicename')
                if (categoriesArrray.length > 0) {
                    self.putCategories(categoriesArrray)
                    resolve()
                } else {
                    errorLogger("no categories found");
                    resolve()
                }
            }else{
                errorLogger("no categories found");
                resolve()
            }

        })
    },
    start: function () {
        successLogger("exporting categories...");
        var self = this;
        return when.promise(function(resolve, reject) {
            self.getAllCategories()
            resolve()
        })


    }
}


module.exports = ExtractCategories;