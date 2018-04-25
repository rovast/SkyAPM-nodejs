/*
 * Licensed to the OpenSkywalking under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'


module.exports = Instrumentation;
var debug = require('debug')('skywalking-instrumentation')
var error = debug('skywalking-instrumentation:error')

/**
 * @author zhang xin
 */
function Instrumentation() {
}

/**
 * Enhance method.
 *
 * Consider this pseudocode example:
 *  var codeEnhancer = ... //
 *  var enhanceObject = ... //
 *  var interceptor = function (){
 *      // do something enhance
 *  }
 * @param originObject
 * @param originMethod
 * @param interceptor
 */
Instrumentation.prototype.enhanceMethod = function (enhanceObject, enhanceMethod, interceptor) {
    if (!enhanceObject || !enhanceObject[enhanceMethod]) {
        return;
    }

    if (!interceptor) {
        return;
    }

    if (!this.isFunction(enhanceObject[enhanceMethod]) || !this.isFunction(interceptor)) {
        return;
    }

    var original = enhanceObject[enhanceMethod];
    var wrapped = interceptor(original, enhanceMethod);
    enhanceObject[enhanceMethod] = wrapped;
    return wrapped;
}

/**
 * Enhance the call back method.
 *
 * Consider this pseudocode example:
 * var originCallback = enhanceObject.callback;
 *   enhanceObject.callback = codeEnhancer.enhanceCallback(function(){
 *      // do something enhance
 *
 *      // call origin callback
 *      originCallback.apply(this, argument);
 *
 *      //
 *   });
 *
 * @param originCallBack
 * @returns {*}
 */
Instrumentation.prototype.enhanceCallback = function (traceContext, contextManager, originCallBack) {
    if (typeof originCallBack !== 'function') return originCallBack;

    if (!traceContext) {
        error("The Callback method won't be enhance because of TraceContext is undefined.");
        return originCallBack;
    }

    var runningTraceContext = traceContext;
    var runningSpan = runningTraceContext.span();

    return function () {
        var previousTraceContext = contextManager.activeTraceContext();
        contextManager.active(runningTraceContext);

        try {
            var result = originCallBack.apply(this, arguments);
        } catch (err) {
            runningSpan.errorOccurred();
            runningSpan.log(err);
            throw err;
        } finally {
            contextManager.active(previousTraceContext);
        }
        return result;
    };
}

Instrumentation.prototype.isFunction = function (funktion) {
    return funktion && {}.toString.call(funktion) === '[object Function]'
}