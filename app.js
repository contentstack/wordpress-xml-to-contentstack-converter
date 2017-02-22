
var sequence                = require('when/sequence');
global.config               = require('./config');
global.errorLogger          = require("./libs/utils/logger.js")("error").error;
global.successLogger        = require("./libs/utils/logger.js")("success").log;
global.warnLogger           = require("./libs/utils/logger.js")("warn").log;




var modulesList     = ['authors','categories','assets','posts'];
var _export         = [];

if(process.argv.length == 3 || process.argv.length == 4) {
    global.filePath = process.argv[3];
    var val = process.argv[2];
    if(val && modulesList.indexOf(val) != -1){
        var ModuleExport = require('./libs/export/'+val+'.js');
        var moduleExport = new ModuleExport();
        _export.push(function(){
            return moduleExport.start() ;
        })
    }else {
        errorLogger("please provide valid module name.")
        return 0;
    }
} else if(process.argv.length==2) {
    global.filePath = undefined;
    for(var i = 0, total = modulesList.length; i < total; i++) {
        var ModuleExport = require('./libs/export/' + modulesList[i] + '.js');
        var moduleExport = new ModuleExport();
        _export.push(function(moduleExport){
            return function(){ return moduleExport.start() } ;
        }(moduleExport));

    }
} else {
    errorLogger("only one module can be exported at a time.");
    return 0;
}

var taskResults = sequence(_export);


taskResults
    .then(function(results) {
        successLogger("Data exporting has been completed");
    })
    .catch(function(error){
        errorLogger(error);
    });


