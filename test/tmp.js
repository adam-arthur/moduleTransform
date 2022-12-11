console.log("i am js")

const a = 1 + 3

angular.module('view', [
    require('./something').default.name,
    createInferredNgVueComponent(require('./SomeComponent.vue')).name,
    createInferredNgVueComponent(
        require('app/view/something/NetworkTable.vue'),
    ).name,
    createInferredNgVueComponent(require('./sample/something/PagesTable.vue'))
        .name,
        
    require('app/view/something/NetworkTable.vue').default
        .name,
    require('app/view/something/NetworkTable2.vue')
        .default.name,
])

const someObj = {
    component: require('somethingElse.html'),
}



