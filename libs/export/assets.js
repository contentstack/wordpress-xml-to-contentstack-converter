/**
 * External module Dependencies.
 */
var mkdirp          = require('mkdirp'),
    path            = require('path'),
    _               = require('lodash'),
    request         =require('request'),
    guard           = require('when/guard'),
    parallel        = require('when/parallel'),
    parseString     = require('xml2js').parseString,
    fs              = require('fs'),
    when            = require('when');


/**
 * Internal module Dependencies .
 */
var helper  = require('../../libs/utils/helper.js');

var assetConfig              = config.modules.asset,
    assetFolderPath          = path.resolve(config.data, assetConfig.dirName),
    assetMasterFolderPath    = path.resolve(config.data, 'master'),
    failedJSON               = helper.readFile(path.join(assetMasterFolderPath, 'wp_failed.json')) || {};

if (!fs.existsSync(assetFolderPath)) {
    mkdirp.sync(assetFolderPath);
    helper.writeFile(path.join(assetFolderPath, assetConfig.fileName))
    mkdirp.sync(assetMasterFolderPath);
    helper.writeFile(path.join(assetMasterFolderPath, assetConfig.fileName))
    helper.writeFile(path.join(assetMasterFolderPath, assetConfig.masterfile))
} else {
    if(!fs.existsSync(path.join(assetFolderPath, assetConfig.fileName)))
        helper.writeFile(path.join(assetFolderPath, assetConfig.fileName))
    if(!fs.existsSync(assetMasterFolderPath)){
        mkdirp.sync(assetMasterFolderPath);
        helper.writeFile(path.join(assetMasterFolderPath, assetConfig.fileName))
        helper.writeFile(path.join(assetMasterFolderPath, assetConfig.masterfile))
    }
}
//Reading a File
var assetData           = helper.readFile(path.join(assetFolderPath, assetConfig.fileName));
var assetMapping        = helper.readFile(path.join(assetMasterFolderPath, assetConfig.fileName));
var assetURLMapping     = helper.readFile(path.join(assetMasterFolderPath, assetConfig.masterfile));



function ExtractAssets() {
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
    saveAsset:function(assets,retryCount) {
        var self = this;
        return when.promise(function (resolve, reject) {
            var url = assets["wp:attachment_url"];
            var name = url.split("/");
            var len = name.length;
            name = name[(len - 1)];
            url=encodeURI(url)
            if(fs.existsSync(path.resolve(assetFolderPath,assets["wp:post_id"].toString(),name))) {
                successLogger("asset already present " + "'" + assets["wp:post_id"] + "'");
                resolve(assets["wp:post_id"])
            } else {
                request.get({
                    url: url,
                    timeout: 60000,
                    encoding: 'binary'
                }, function (err, response, body) {
                    if (err) {
                        failedJSON[assets["wp:post_id"]]=err
                        if(retryCount==1)
                            resolve(assets["wp:post_id"])
                        else{
                            self.saveAsset(assets, 1)
                                .then(function(results){
                                    resolve();
                                })
                        }
                    } else {
                        if (response.statusCode != 200) {
                            var status="status code: "+response.statusCode
                            failedJSON[assets["wp:post_id"]]=status
                            if(retryCount==1)
                                resolve(assets["wp:post_id"])
                            else{
                                self.saveAsset(assets, 1)
                                    .then(function(results){
                                        resolve();
                                    })
                            }
                        } else {
                            mkdirp.sync(path.resolve(assetFolderPath, assets["wp:post_id"].toString()));
                            fs.writeFile(path.join(assetFolderPath, assets["wp:post_id"].toString(), name), body, 'binary', function (writeerror) {
                                if (writeerror) {
                                    failedJSON[assets["wp:post_id"]]=writeerror
                                    if (fs.existsSync(path.resolve(assetFolderPath, assets["wp:post_id"].toString()))){
                                        fs.unlinkSync(path.resolve(assetFolderPath, assets["wp:post_id"].toString()))
                                    }

                                    if(retryCount==1)
                                        resolve(assets["wp:post_id"])
                                    else{
                                        self.saveAsset(assets, 1)
                                            .then(function(results){
                                                resolve();
                                            })
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
    getAsset: function(attachments){
        var self = this;
        return when.promise(function(resolve, reject){
            var _getAsset = [];
            for(var i = 0, total = attachments.length; i < total; i++) {
                _getAsset.push(function(data){
                    return function(){ return self.saveAsset(data,0);};
                }(attachments[i]));
            }
            var guardTask = guard.bind(null, guard.n(5));
            _getAsset = _getAsset.map(guardTask);
            var taskResults = parallel(_getAsset);
            taskResults
                .then(function(results) {
                    helper.writeFile(path.join(assetFolderPath,assetConfig.fileName),JSON.stringify(assetData, null, 4))
                    helper.writeFile(path.join(assetMasterFolderPath,assetConfig.fileName),JSON.stringify(assetMapping, null, 4))
                    helper.writeFile(path.join(assetMasterFolderPath,assetConfig.masterfile),JSON.stringify(assetURLMapping, null, 4))
                    helper.writeFile(path.join(assetMasterFolderPath, 'wp_failed.json'), JSON.stringify(failedJSON, null, 4));
                    resolve(results);
                })
                .catch(function(e){
                    errorLogger('failed to download assets: ', e);
                    resolve()
                });

        })

    },
    getAllAssets: function(){
        var self = this;
        return when.promise(function(resolve, reject){
            var alldata=helper.readFile(path.join(config.data, config.json_filename));
            var assets =  alldata.rss.channel.item;
            if(assets) {
                if (assets.length > 0) {
                    if(!filePath){
                        var attachments=_.filter(assets,{"wp:post_type":"attachment"});    //for media(assets)
                        self.getAsset(attachments)
                         .then(function(){
                                resolve()
                         })
                         .catch(function(){
                                reject()
                         })
                    }else{ //if want to custom export
                        var assetids=[];
                        if(fs.existsSync(filePath)) {
                            assetids=(fs.readFileSync(filePath, 'utf-8')).split(",");
                        }
                        if(assetids.length>0) {
                            var assetDetails = [];
                            assetids.map(function (asset, index) {
                                var index = _.findIndex(assets, {"wp:post_id": asset})
                                if (index != -1)
                                    if (assets[index]["wp:post_type"] == "attachment")
                                        assetDetails.push(assets[index])
                            })
                            if(assetDetails.length>0){
                                self.getAsset(assetDetails)
                                .then(function(){
                                        resolve()
                                })
                                .catch(function(){
                                        reject()
                                })
                            }else{
                                errorLogger("please provide valid id for assets export");
                                resolve()
                            }
                        }else{
                            errorLogger("no assets id found");
                           resolve()
                        }
                    }
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
                .then(function(){
                    resolve()
                })
                .catch(function(){
                    reject()
                })
        })
    }
}


module.exports = ExtractAssets;