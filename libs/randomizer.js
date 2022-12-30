const { faker } = require('@faker-js/faker')
const Mustache = require('mustache');
const crypto = require('crypto');
const fs = require('fs');
const path = require("path");

const fakeIt = (string) => { 
    let stringArr = string.split(/(\${faker[^}]+})/)

    for (let i = 0; i < stringArr.length; i++) {
        const chunk = stringArr[i];
        if(chunk.indexOf('${faker.') === 0){
            //found calling to faker, lets parse and excute it;
            let fakerCall = chunk.replace(/\${([a-zA-Z\.0-9]+)(:([^}]+))?}/, "return this.$1($3)");
            let res = new Function(fakerCall).apply({faker});
            stringArr[i] = res;
        } 
    }

    return stringArr.join('');
}


const Cache = {
    cacheDir: function(){ 
        return __dirname + '/../cache/'; 
    },
    key: function(text){
        return crypto.createHash('md5').update(text).digest('hex');
    },
    set: function(key, contents){ 
        return fs.writeFileSync(this.cacheDir() + key, contents);
    },
    get: function(key){
        try { //just in case of IO error
            if(fs.existsSync(this.cacheDir() + key)){
                return fs.readFileSync(this.cacheDir() + key, {encoding:'utf-8'})
            }
            return false;
        } catch (error) {
            return false;
        }
    },
    reset: function(){
        let directory = this.cacheDir();
        fs.readdir(directory, (err, files) => {
            if (err) throw err;
          
            for (const file of files) {
                if(file === '.gitignore') continue;
                fs.unlink(path.join(directory, file), (err) => {
                    if (err) throw err;
                });
            }

        });
    }
}



const render = (httpRequest, contents, vars) => {
    let renderedContents;

    //check cache first
    let cacheKey = Cache.key(httpRequest.path);
    let res = Cache.get(cacheKey)
    if(res){
        return res;
    }

    //cache not found, create it
    renderedContents = fakeIt(contents)

    renderedContents = Mustache.render(renderedContents, vars);
    Cache.set(cacheKey, renderedContents);

    return renderedContents;
}

module.exports = {
    faker,
    fakeIt,
    render,
    Cache
}