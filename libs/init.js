const express = require('express')
const session = require('express-session')
const mustacheExpress = require('mustache-express');

const { createLogger, format, transports } = require('winston');


module.exports = (config) => {

    console.log('Init: starting')

    const app = express()


    console.log('Init: Configuring required middlewares (sessions, bodyparser)')
    //configure session
    app.set('trust proxy', 1) // trust first proxy
    // app.use(session({
    //     secret: process.env.appKey,
    //     resave: false,
    //     saveUninitialized: true,
    //     //cookie: { secure: true } //production only ssl
    // }))

    app.use(express.json()) // for parsing application/json
    app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded



    console.log('Init: Configure datadog logger')
    //configure logger
    const httpTransportOptions = {
        host: 'http-intake.logs.datadoghq.com',
        path: '/api/v2/logs?dd-api-key='+process.env.DD_API_KEY+'&ddsource=nodejs&service='+process.env.DD_SERVICE,
        ssl: true
    };
    
    const logger = createLogger({
        level: 'info',
        exitOnError: false,
        format: format.json(),
        transports: [
            new transports.Http(httpTransportOptions),
        ],
    });

    const datadogLogger = function (req, res, next) {
        app.logger = (id, title, info) => {
            logger.info('APPSEC HONEYPOT:' + title,{
                templateId: id,
                info,
                request:{
                    path:  req.path,
                    method: req.method,                
                    query: req.query,
                    params: req.params,
                    body: req.body,
                    cookies: req.cookies,
                    ip: req.ip
                }
            });
        }
        next()
    }
    
    app.use(datadogLogger)


    console.log('Init: Configure template engine')
    app.engine('mustache', mustacheExpress());


    app.set('view engine', 'mustache');
    app.set('views', __dirname + '/../views');

    //remove signature
    app.disable('x-powered-by');

    //add global headers if any
    app.use(function(req, res, next) {
        for (const header in config.headers) {
            res.setHeader(header, config.headers[header])
        }
        next();
    });

    return app;
}