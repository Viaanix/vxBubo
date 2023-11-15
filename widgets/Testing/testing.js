self.onInit = function() {
    var $injector = self.ctx.$scope.$injector;
    var utils = $injector.get(self.ctx.servicesMap.get('utils'));

    var cssParser = new cssjs();
    cssParser.testMode = false;
    var namespace = 'html-card-' + hashCode(self.ctx.settings.cardCss);
    cssParser.cssPreviewNamespace = namespace;
    cssParser.createStyleElement(namespace, self.ctx.settings.cardCss);
    self.ctx.$container.addClass(namespace);
    var evtFnPrefix = 'htmlCard_' + Math.abs(hashCode(self.ctx.settings.cardCss + self.ctx.settings.cardHtml + self.ctx.widget.id));
    cardHtml =  '<div style="height:100%" onclick="' + evtFnPrefix + '_onClickFn(event)">' + 
                self.ctx.settings.cardHtml + 
                '</div>';
    cardHtml = replaceCustomTranslations(cardHtml);
    self.ctx.$container.html(cardHtml);

    window[evtFnPrefix + '_onClickFn'] = function (event) {
        self.ctx.actionsApi.elementClick(event);
    }

    function hashCode(str) {
        var hash = 0;
        var i, char;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }
    
    function replaceCustomTranslations (pattern) {
        var customTranslationRegex = new RegExp('{i18n:[^{}]+}', 'g');
        pattern = pattern.replace(customTranslationRegex, getTranslationText);
        return pattern;
    }
    
    function getTranslationText (variable) {
        return utils.customTranslation(variable, variable);
        
    }
}

self.actionSources = function() {
    return {
        'elementClick': {
            name: 'widget-action.element-click',
            multiple: true
        }
    };
}

self.onDestroy = function() {
}
