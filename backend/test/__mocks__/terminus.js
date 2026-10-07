const { Module, Injectable } = require('@nestjs/common');

class HealthCheckService {
    check() {
        return Promise.resolve({ status: 'ok' });
    }
}
Injectable()(HealthCheckService);

class TerminusModule { }
Module({
    providers: [HealthCheckService],
    exports: [HealthCheckService],
})(TerminusModule);

const HealthCheck = () => () => { };

module.exports = {
    TerminusModule,
    HealthCheckService,
    HealthCheck
};
