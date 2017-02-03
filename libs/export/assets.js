/**
 * External module Dependencies.
 */
var mkdirp    = require('mkdirp'),
    path      = require('path'),
    _         = require('lodash'),
    request  =require('request'),
    guard     = require('when/guard'),
    parallel  = require('when/parallel'),
    parseString = require('xml2js').parseString,
    fs = require('fs'),
    when      = require('when');


/**
 * Internal module Dependencies .
 */
var helper = require('../../libs/utils/helper.js');
var logFolder='../../libs/utils/logs';

var assetConfig = config.modules.asset,
    assetFolderPath = path.resolve(config.data, assetConfig.dirName),
    masterFolderPath = path.resolve(config.data, 'master'),
    failedJSON           = helper.readFile(path.join(masterFolderPath, 'wp_failed.json')) || {};

if (!fs.existsSync(assetFolderPath)) {
    mkdirp.sync(assetFolderPath);
    helper.writeFile(path.join(assetFolderPath, assetConfig.fileName))
    mkdirp.sync(masterFolderPath);
    helper.writeFile(path.join(masterFolderPath, assetConfig.fileName))
    helper.writeFile(path.join(masterFolderPath, assetConfig.masterfile))
}else{
    if(!fs.existsSync(path.join(assetFolderPath, assetConfig.fileName)))
        helper.writeFile(path.join(assetFolderPath, assetConfig.fileName))
    if(!fs.existsSync(masterFolderPath)){
        mkdirp.sync(masterFolderPath);
        helper.writeFile(path.join(masterFolderPath, assetConfig.fileName))
        helper.writeFile(path.join(masterFolderPath, assetConfig.masterfile))
    }


}
//Reading a File
var assetData = helper.readFile(path.join(assetFolderPath, assetConfig.fileName));
var assetMapping = helper.readFile(path.join(masterFolderPath, assetConfig.fileName));
var assetURLMapping = helper.readFile(path.join(masterFolderPath, assetConfig.masterfile));
var failedAssets=[];


function ExtractAssets(){
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

ExtractAssets.prototype = {
    saveAsset:function(assets){
        var self = this;
        return when.promise(function (resolve, reject) {
            var url = assets["wp:attachment_url"];
            var name = url.split("/");
            var len = name.length;
            name = name[(len - 1)];
            url=encodeURI(url)
            if(fs.existsSync(path.resolve(assetFolderPath,assets["wp:post_id"].toString(),name))){
                successLogger("asset already present " + "'" + assets["wp:post_id"] + "'");
                resolve(assets["wp:post_id"])
            }else {
                request.get({
                    url: url,
                    timeout: 60000,
                    encoding: 'binary'
                }, function (err, response, body) {
                    if (err) {
                        if(failedAssets.indexOf(assets["wp:post_id"])==-1){
                            failedAssets.push(assets["wp:post_id"])
                            failedJSON[assets["wp:post_id"]]=err
                        }
                        resolve(assets["wp:post_id"])
                    } else {
                        if (response.statusCode != 200) {
                            if(failedAssets.indexOf(assets["wp:post_id"])==-1){
                                failedAssets.push(assets["wp:post_id"])
                                failedJSON[assets["wp:post_id"]]=body
                            }
                            resolve(assets["wp:post_id"])
                        } else {
                            mkdirp.sync(path.resolve(assetFolderPath, assets["wp:post_id"].toString()));
                            fs.writeFile(path.join(assetFolderPath, assets["wp:post_id"].toString(), name), body, 'binary', function (writeerror) {
                                if (writeerror) {
                                    if(failedAssets.indexOf(assets["wp:post_id"])==-1) {
                                        failedAssets.push(assets["wp:post_id"])
                                        failedJSON[assets["wp:post_id"]]=writeerror
                                    }
                                    if (fs.existsSync(path.resolve(assetFolderPath, assets["wp:post_id"].toString()))){
                                        fs.unlinkSync(path.resolve(assetFolderPath, assets["wp:post_id"].toString()))
                                    }

                                } else {
                                    assetData[assets["wp:post_id"]] = {
                                        uid: assets["wp:post_id"],
                                        filename: name,
                                        url: url,
                                        status: true
                                    }
                                    assetMapping[assets["wp:post_id"]] = ""
                                    assetURLMapping[url] = ""
                                    var id=assets["wp:post_id"];
                                    if(failedJSON[assets["wp:post_id"]]){
                                        delete failedJSON[assets["wp:post_id"]]
                                    }

                                    successLogger("exported asset " + "'" + assets["wp:post_id"] + "'");
                                }
                                resolve(assets["wp:post_id"])
                            })
                        }
                    }
                })
            }
        })
    },
    retryFailedAssets: function(assetids){
        var self = this;
        return when.promise(function(resolve, reject) {
            var alldata=helper.readFile(path.join(config.data, config.json_filename));
            var assets =  alldata.rss.channel.item;
            if(assets) {
                var assetdetails = []
                assetids.map(function (asset, index) {
                    var index = _.findIndex(assets, {"wp:post_id": asset})
                    if (index != -1)
                        if (assets[index]["wp:post_type"] == "attachment")
                            assetdetails.push(assets[index])
                })
                if (assetdetails.length > 0) {
                    var _getAsset = [];
                    for(var i = 0, total = assetdetails.length; i < total; i++) {
                        _getAsset.push(function(data){
                            return function(){ return self.saveAsset(data);};
                        }(assetdetails[i]));
                    }
                    var guardTask = guard.bind(null, guard.n(2));
                    _getAsset = _getAsset.map(guardTask);
                    var taskResults = parallel(_getAsset);
                    taskResults
                        .then(function(results) {
                            helper.writeFile(path.join(assetFolderPath,assetConfig.fileName),JSON.stringify(assetData, null, 4))
                            helper.writeFile(path.join(masterFolderPath,assetConfig.fileName),JSON.stringify(assetMapping, null, 4))
                            helper.writeFile(path.join(masterFolderPath,assetConfig.masterfile),JSON.stringify(assetURLMapping, null, 4))
                            helper.writeFile(path.join(masterFolderPath, 'wp_failed.json'), JSON.stringify(failedJSON, null, 4));
                            resolve(results);
                        })
                        .catch(function(e){
                            errorLogger('failed to download assets: ', e);
                            reject(e);
                        });
                } else {
                    errorLogger("assets not found");
                    resolve()
                }
            }else{
                errorLogger("no assets found");
                resolve()
            }
        })
    },
    getAllAssets: function(){
        var self = this;
        return when.promise(function(resolve, reject){
            var alldata=helper.readFile(path.join(config.data, config.json_filename));
            var assets =  alldata.rss.channel.item;
            if(assets) {
                if (assets.length > 0) {
                    var attachments=_.filter(assets,{"wp:post_type":"attachment"});
                    var _getAsset = [];
                    for(var i = 0, total = attachments.length; i < total; i++) {
                        _getAsset.push(function(data){
                            return function(){ return self.saveAsset(data);};
                        }(attachments[i]));
                    }
                    var guardTask = guard.bind(null, guard.n(2));
                    _getAsset = _getAsset.map(guardTask);
                    var taskResults = parallel(_getAsset);

                    taskResults
                        .then(function(results) {
                            helper.writeFile(path.join(assetFolderPath,assetConfig.fileName),JSON.stringify(assetData, null, 4))
                            helper.writeFile(path.join(masterFolderPath,assetConfig.fileName),JSON.stringify(assetMapping, null, 4))
                            helper.writeFile(path.join(masterFolderPath,assetConfig.masterfile),JSON.stringify(assetURLMapping, null, 4))
                            if(failedAssets.length>0)
                                self.retryFailedAssets(failedAssets)
                            resolve(results);
                        })
                        .catch(function(e){
                            errorLogger('failed to download assets: ', e);
                            reject(e);
                        });
                } else {
                    errorLogger("no assets found");
                    resolve()
                }
            }else{
                errorLogger("no assets found");
                resolve()
            }
        })
    },
    start: function () {
        successLogger("exporting assets...");
        var self = this;
        return when.promise(function(resolve, reject) {
            self.getAllAssets()
            resolve()
        })
    }
}


module.exports = ExtractAssets;