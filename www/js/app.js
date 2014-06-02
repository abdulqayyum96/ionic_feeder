// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic'])

.run(function($ionicPlatform, $ionicSlideBoxDelegate, $ionicSideMenuDelegate, $ionicNavBarDelegate) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

.controller('MenuCtrl', function($scope) {
  $scope.about = function() {
    alert("about");
  }

  $scope.share = function() {
    alert("Share code");
  }

  $scope.enterCode = function() {
    alert("Enter code");
  }

  $scope.postAllFeedings = function() {
    app.postAllFeedings();
  }
})

.controller('CounterCtrl', function($scope, $timeout) {
  $scope.feedings = new Array(8);
  $scope.todaysFeedings = [];
  $scope.feedings[7] = $scope.todaysFeedings;
  $scope.currentFeeding = false;
  $scope.leftSign = "L";
  $scope.rightSign= "R";
  $scope.lClass="";
  $scope.rClass="";
  $scope.timeSinceLast = "";
  $scope.timeSinceLastSuffix = "";
  $scope.activeSlide = 7;

  $scope.setTimeSinceLast = function() {
    if($scope.todaysFeedings.length == 0) {
      $scope.timeSinceLast = ".. well.. never";
      $scope.timeSinceLastSuffix = ".";
    } else {
      var latestRow = $scope.todaysFeedings[0]; //Remember. The rows are in reverse order.
      var feedingTooRecent = ((new Date().getTime()) - latestRow.startTime - latestRow.duration) < 60 * 1000; 
      if (feedingTooRecent) {
        $scope.timeSinceLast = "just now";
        $scope.timeSinceLastSuffix = ".";
      } else {
        var sinceLastStart = app.getTimeAgo((new Date().getTime()) - latestRow.startTime);
        var sinceLastEnd = app.getTimeAgo((new Date().getTime()) - latestRow.startTime - latestRow.duration);
        $scope.timeSinceLast = sinceLastStart + " (" + sinceLastEnd + ") ";
        $scope.timeSinceLastSuffix = "ago.";
      }
    }
  }

  var mytimeout = null;

  $scope.reloadTodaysFeedings = function() {
      storage.getDataForDay(0, function (rows) {
        var latestRow = false;
        if(rows.length > 0) {
          latestRow = rows[0]; //Remember. The rows are in reverse order.
          if(latestRow.ongoing) {
            rows.shift();
            $scope.continue(latestRow);
          }
          $scope.setPredictedSupplier(latestRow);
        }
        $scope.feedings[7] = rows;
        $scope.todaysFeedings = $scope.feedings[7];
        $scope.setTimeSinceLast();
        $scope.$apply();
        mytimeout = $timeout($scope.onTimeout,1000);
        document.addEventListener('resume', function () { app.getNewFeedings(latestRow, $scope.mergeNewItems); }, false);
        // app.getNewFeedings(latestRow, $scope.mergeNewItems);
      });
  }
  setTimeout($scope.reloadTodaysFeedings, 1);

  $scope.onTimeout = function(){
    if($scope.currentFeeding && $scope.currentFeeding.ongoing) {
      $scope.currentFeeding.duration = new Date().getTime() - $scope.currentFeeding.startTime;
      if($scope.currentFeeding.duration > MAX_TIME_MINUTES * 60 * 1000) {
        $scope.currentFeeding.duration = MAX_TIME_MINUTES * 60 * 1000;
        $scope.toggleFeeding($scope.currentFeeding.supplier);
      }
    }
    $scope.setTimeSinceLast();  
    mytimeout = $timeout($scope.onTimeout,1000);
  };

  $scope.toggleFeeding = function(supplier) {
    if($scope.currentFeeding) {
      $scope.finnish(supplier);
    } else {
      $scope.begin(supplier);
    }
  };

  $scope.begin = function(supplier) {
    $scope.continue({ supplier: supplier, startTime: new Date().getTime(), duration: 0, volume: 0, ongoing: true });
    storage.storeAndSync($scope.currentFeeding);
  }

  $scope.continue = function(feeding) {
    $scope.currentFeeding = feeding;    
    if(feeding.supplier === 'L') {
      $scope.leftSign = STOP_SIGN;
    } else if(feeding.supplier === 'R') {
      $scope.rightSign = STOP_SIGN;
    }
    $scope.setPredictedSupplier(feeding);
  }

  $scope.finnish = function(supplier) {
    $scope.todaysFeedings.unshift($scope.currentFeeding);
    $scope.currentFeeding.ongoing = false;
    storage.storeAndSync($scope.currentFeeding);
    $scope.setPredictedSupplier($scope.currentFeeding);
    $scope.currentFeeding = false;
    $scope.leftSign = 'L';
    $scope.rightSign= 'R';
  }

  $scope.mergeNewItems = function(newItems) {
    if (newItems && newItems.length > 0) {
      var needReloading = false;
      var feeding = false;
      for (var i = 0; i < newItems.length; i++) {
        feeding = newItems[i];
        if( feeding.ongoing === 'true' || feeding.ongoing === true ) {
          console.log("ongoing feeding: " + feeding.id);
          $scope.continue(feeding);
        } else if(!$scope.hasId(feeding.id)) {
          needReloading = true;
          storage.store(feeding);
        }
      }
      $scope.setTimeSinceLast();
      if(feeding && !$scope.currentFeeding) {
        $scope.setPredictedSupplier(feeding);
      }
      if (needReloading) {
        $scope.reloadTodaysFeedings();
      }
    }
  }

  $scope.hasId = function(id) {
    for (var i = 0; i < $scope.feedings.length; i++) {
      if($scope.feedings[i]) {
        for (var j = 0; j < $scope.feedings[i].length; j++) {
          if($scope.feedings[i][j].id === id) {
            console.log("Turns out " + $scope.feedings[i][j].id + " === " + id );
            return true;
          }
        }
      }
    };
    return false;
  }

  $scope.timeToPrevFeeding = function(activeSlide, index) {
    if(index < 1) {
      return "";
    }
    var next = $scope.feedings[activeSlide][index - 1];
    var curr = $scope.feedings[activeSlide][index ];
    if(next && curr) {
      return app.getTimeAgo(next.startTime - curr.startTime - curr.duration);
    }
  }

  $scope.setPredictedSupplier = function(feeding) {
    $scope.lClass = "";
    $scope.rClass = "";
    var previousSupplier = feeding.supplier;
    if(!feeding.ongoing) {
      if(previousSupplier === 'L') {
        $scope.rClass = "selected";
      } else if(previousSupplier === 'R') {
        $scope.lClass = "selected";
      }
    }
  }

  $scope.slideHasChanged = function(index) {
    console.log("Slide changed to " + index);
    if (! $scope.feedings[index]) {
      var dayOffset = index - 7;
      console.log("Fetching data for " + dayOffset);
      storage.getDataForDay(dayOffset, function (rows) {
        console.log("Setting fetched data");
        $scope.feedings[index] = rows;
        $scope.$apply();
      });
    }
  }

})
