/**
 * External module Dependencies.
 */
var mkdirp    = require('mkdirp'),
    path      = require('path'),
    _ = require('lodash'),
    fs = require('fs'),
    parseString = require('xml2js').parseString,
    url = require('url'),
    when      = require('when');

/**
 * Internal module Dependencies.
 */
var helper = require('../../libs/utils/helper.js');

var postConfig = config.modules.posts,
    postFolderPath = path.resolve(config.data,config.entryfolder, postConfig.dirName),
    folderpath=path.resolve(config.data, config.modules.asset.dirName),
    masterFolderPath = path.resolve(config.data, 'master',config.entryfolder);

//Creating a asset folder if we run this first
if (!fs.existsSync(folderpath)) {
    mkdirp.sync(folderpath);
}
helper.writeFile(path.join(folderpath,config.modules.asset.featuredfileName))

if (!fs.existsSync(postFolderPath)) {
    mkdirp.sync(postFolderPath);
    helper.writeFile(path.join(postFolderPath, postConfig.fileName))
    mkdirp.sync(masterFolderPath);
    helper.writeFile(path.join(masterFolderPath, postConfig.masterfile), '{"en-us":{}}')
}
function ExtractPosts(){
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

ExtractPosts.prototype = {
    featuredImageMapping:function(postid,post,postdata){
        if(post["wp:postmeta"]){
            var postmeta=post["wp:postmeta"];
            if(Array.isArray(postmeta)){
                postmeta.map(function(meta,index){
                    if(meta["wp:meta_key"]=="_thumbnail_id"){
                        var attachmentid=meta["wp:meta_value"]
                        var data = helper.readFile(path.join(folderpath,config.modules.asset.featuredfileName));
                        data[postid]=attachmentid;
                        helper.writeFile(path.join(folderpath,config.modules.asset.featuredfileName), JSON.stringify(data, null, 4))
                        postdata[postid]["featured_image"]=attachmentid
                    }
                })
            }else{
                if(postmeta["wp:meta_key"]){
                    if(postmeta["wp:meta_key"]=="_thumbnail_id"){
                        var attachmentid=postmeta["wp:meta_value"]
                        var data = helper.readFile(path.join(folderpath,config.modules.asset.featuredfileName));
                        data[postid]=attachmentid;
                        helper.writeFile(path.join(folderpath,config.modules.asset.featuredfileName), JSON.stringify(data, null, 4))
                        postdata[postid]["featured_image"]=attachmentid
                    }
                }
            }

        }
    },
    putPosts: function(postsdetails){
        var self = this;
        return when.promise(function(resolve, reject) {
            var postdata = helper.readFile(path.join(postFolderPath, postConfig.fileName));
            var postmaster =helper.readFile(path.join(masterFolderPath, postConfig.masterfile));
            postsdetails.map(function (data, index) {
                if (data["wp:post_type"] == "post") {
                    if (data["wp:status"] == "publish") {
                        var index = _.findIndex(postdata, {"id": data["wp:post_id"]})
                        var postcategories = []
                        var categories = data["category"];
                        if(Array.isArray(categories)){
                            categories.map(function (category, instanceIndex) {
                                if (category["$"]["domain"] == "category") {
                                    postcategories.push(category["$"]["nicename"])
                                }
                            })
                        }else{
                            if (categories["$"]["domain"] == "category") {
                                postcategories.push(categories["$"]["nicename"])
                            }
                        }

                        var date=new Date(data["wp:post_date_gmt"])
                        var url="/"+(data["link"]).replace(/^(?:\/\/|[^\/]+)*\//, "")
                       // var url=data["link"];
                        postdata[data["wp:post_id"]]={title:data["title"],url:url,author:data["dc:creator"].split(","),category:postcategories,
                            date:date.toISOString(),full_description:data["content:encoded"]}
                        postmaster["en-us"][data["wp:post_id"]] = ""
                        successLogger("exported post " +"'"+data["wp:post_id"]+"'");
                        self.featuredImageMapping(data["wp:post_id"],data,postdata)
                    }
                }
            })
            helper.writeFile(path.join(postFolderPath, postConfig.fileName), JSON.stringify(postdata, null, 4))
            helper.writeFile(path.join(masterFolderPath, postConfig.masterfile), JSON.stringify(postmaster, null, 4))
            resolve();
        })
    },
    getAllPosts: function() {
        var self = this;
        return when.promise(function(resolve, reject) {
            var alldata=helper.readFile(path.join(config.data, config.json_filename));
            var posts = alldata.rss.channel['item'];
            if(posts) {
                if (posts.length > 0) {
                    self.putPosts(posts)
                    resolve()
                } else {
                    errorLogger("no posts found");
                    resolve()
                }
            }else{
                errorLogger("no posts found");
                resolve()
            }
        })
    },
    start: function () {
        successLogger("exporting posts...");
        var self = this;
        return when.promise(function (resolve, reject) {
            self.getAllPosts()
            resolve()
        })
    }
}

module.exports = ExtractPosts;