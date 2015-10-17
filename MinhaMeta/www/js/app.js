var DB = null;

var app = angular.module('starter', ['ionic','ngCordova']);

app.run(function($ionicPlatform, $cordovaSQLite) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }

    DB = window.openDatabase("minha_meta.db", "1.0", "MinhaMeta", -1);
    
    //$cordovaSQLite.execute(DB, "DROP TABLE meta");

    $cordovaSQLite.execute(DB, 
    "CREATE TABLE IF NOT EXISTS meta (" +
      "id integer primary key autoincrement, "+
      "nome text, "+
      "descricao text, "+
      "minutos integer, "+
      "concluido integer "+
    ")");

  });
});

app.config(function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise('/')

  $stateProvider.state('home', {
    url: '/',
    controller: 'IndexController',
    templateUrl: 'home.html'
  }).state('cadastro', {
    url: '/cadastro',
    controller: 'CadastroController',
    templateUrl: 'cadastro.html'
  }).state('meta', {
    url: '/meta',
    controller: 'MetaController',
    templateUrl: 'meta.html'
  })
})

app.controller('IndexController', ['$scope','$state','$cordovaSQLite','$rootScope', function($scope,$state,$cordovaSQLite,$rootScope){
  $rootScope.viewState=0;
  $scope.metas = [];

  $scope.list = function(){
    var query = "SELECT * FROM meta ORDER BY id DESC";
    $cordovaSQLite.execute(DB, query, []).then(function (result){
      if(result.rows.length){
        $rootScope.viewState=2;
        var output = [];
        for (var i = 0; i < result.rows.length; i++) {
          output.push(result.rows.item(i));
        }
        $scope.metas = output;
        console.log("$scope.metas: ", $scope.metas);
      } else {
        $rootScope.viewState=1;
      }
    }, function(err){
      console.log("error SQL: ", err);
    });
  }

  $scope.list();

  $rootScope.criarMeta = function (){
    $state.go("cadastro");
  }

  $scope.verMeta = function (meta){
    $rootScope.meta = meta;
    $state.go("meta");
  }

  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams){ 
    $scope.list();
    if(toState.name == "meta"){
      $rootScope.showMenu=true;
    } else {
      $rootScope.showMenu=false;
    }
  })

}]);

app.controller('CadastroController', ['$scope','$state','$cordovaSQLite','$ionicHistory', function($scope,$state,$cordovaSQLite,$ionicHistory){
  $scope.meta = {};
  $scope.criarMeta = function (){
    var query = "INSERT INTO meta (nome,descricao,minutos) VALUES (?,?,?)";
    var pars = [$scope.meta.nome, $scope.meta.descricao, $scope.meta.minutos*60];
    console.log("pars", pars);
    $cordovaSQLite.execute(DB, query, pars).then(function (result){
      console.log("INSERT: ", result.insertId);
      $ionicHistory.goBack(); 
    }, function(err){
      console.log("error SQL: ", err);
    });
  }
}]);


app.controller('MetaController', ['$scope','$state','$cordovaSQLite','$ionicHistory','$interval', '$timeout','$rootScope','$ionicPopover', function($scope,$state,$cordovaSQLite,$ionicHistory,$interval,$timeout,$rootScope,$ionicPopover){
  $scope.meta = angular.copy($rootScope.meta);
  $scope.rodando=false;
  $scope.deg = 0;
  $scope.segundos = 0;
  $scope.minutos = 0;
  $scope.horas = 0;

  if(!$scope.meta.id){
    $ionicHistory.goBack();
  }

  var horas = "";
  if($scope.meta.concluido >= 60){
    var d = $scope.meta.concluido/60;
    if(d % 1 !== 0){
      var h = Math.floor(d);
      var m = ((d % 1) * 60).toFixed(0);
      horas += h+"h ";
      horas += m+"m";
    } else {
      horas = d;
      if(d > 1){
        horas += " horas";
      } else {
        horas += " hora";
      }
    }
  } else {
    horas = $scope.meta.concluido;
    if($scope.meta.concluido > 1){
      horas += " minutos";
    } else {
      horas += " minuto";
    }
  }
  $scope.meta.concluido_text = horas;

  $ionicPopover.fromTemplateUrl('my-popover.html', {
    scope: $scope
  }).then(function(popover) {
    $scope.popover = popover;
  });

  $rootScope.openPopover = function($event) {
    $scope.popover.show($event);
  };
  $rootScope.closePopover = function() {
    $scope.popover.hide();
  };

  $scope.onTimeout = function(){
      $scope.segundos++;
      if($scope.segundos == 60){
        $scope.minutos++;
        $scope.segundos=0;
      }
      if($scope.minutos==60){
        $scope.horas++;        
        $scope.minutos=0;
      }
      $scope.mytimeout = $timeout($scope.onTimeout,1000);
  }

  $scope.iniciar = function (){
    $scope.rodando=true;
    $scope.deg = 0;
    $scope.segundos = 1;
    $scope.minutos = 0;
    $scope.horas = 0;
    $scope.rotate = function (angle) {
        $scope.angle = angle;
    };
    $scope.stopRotate = $interval(function (){
      if($scope.deg==359){
        $scope.deg=0;
      }
      $scope.rotate($scope.deg++);
    },10);
    
    $scope.mytimeout = $timeout($scope.onTimeout,1000);
  }

  $scope.parar = function (){
    $scope.rodando=false;    
    $interval.cancel($scope.stopRotate);
    $timeout.cancel($scope.mytimeout);
    var minutos_concluido = ($scope.horas*60) + $scope.minutos;
    minutos_concluido = minutos_concluido + $scope.meta.concluido;
    var query = "UPDATE meta SET  concluido=(?) WHERE id=(?)";
    var pars = [minutos_concluido, $scope.meta.id];
    console.log("pars: ", pars);
    console.log("query: ", query);
    $cordovaSQLite.execute(DB, query, pars).then(function (result){
      console.log("UPDATE: ", result);
      $ionicHistory.goBack();
    }, function(err){
      console.log("error SQL: ", err);
    });
  }

  $rootScope.zerar = function(){
    $rootScope.closePopover();
    var query = "UPDATE meta SET  concluido=(?) WHERE id=(?)";
    var pars = [0, $scope.meta.id];
    $cordovaSQLite.execute(DB, query, pars).then(function (result){
      console.log("UPDATE: ", result);
      $ionicHistory.goBack();
    }, function(err){
      console.log("error SQL: ", err);
    }); 
  }
  $rootScope.excluir = function(){
    $rootScope.closePopover();
    var query = "DELETE FROM meta WHERE id=(?)";
    var pars = [$scope.meta.id];
    $cordovaSQLite.execute(DB, query, pars).then(function (result){
      console.log("DELETE: ", result);
      $ionicHistory.goBack();
    }, function(err){
      console.log("error SQL: ", err);
    }); 
  }

}]);

app.directive('rotate', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            scope.$watch(attrs.degrees, function (rotateDegrees) {
                var r = 'rotate(' + rotateDegrees + 'deg)';
                element.css({
                    '-moz-transform': r,
                    '-webkit-transform': r,
                    '-o-transform': r,
                    '-ms-transform': r
                });
            });
        }
    }
});