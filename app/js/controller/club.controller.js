/**=========================================================
 * Module: clubController
 * Description: Controller for Club item in Profile menu.
 * Author: Marcin - 2015-11-19
 =========================================================*/
(function() {
    'use strict';

    angular
        .module('app.profile-clubs', ['ngAnimate', 'ui.bootstrap','flash', 'ngFileUpload'])
        .directive('memberAction', function($rootScope, LookupService, ViewerService){
          return {
            restrict: 'E',
            scope: {
              actionType: '=',
              accountId: '='              
            },
            templateUrl: 'app/views/partials/member-action.html',
            link: function(scope, elm, attr){
              // Get Relationship Types
              LookupService.getRelationshipTypes().then(function(types){
                scope.relationshipTypes = types;
              }, function(error){
                console.log(error);
                return;
              })

              scope.updateRelation = function(relationId){
                var viewerId = $rootScope.user.externalId;
                var accountId = scope.accountId;

                if(relationId == 0){
                  ViewerService.removeMembership(viewerId, accountId).then(function(data){
                    if(data.error == 'Not Found'){
                      console.log("Error! ", data.error);
                      return;
                    }
                    console.log(data);
                  });

                  ViewerService.removeRelation(viewerId, accountId).then(function(data){
                    if(data.error == 'Not Found'){
                      console.log("Error! ", data.error);
                      return;
                    }
                    console.log(data);
                  });

                  scope.$parent.$emit('account', accountId);

                }else{
                  ViewerService.updateRelation(viewerId, accountId, relationId).then(function(data){
                    if(data.error == 'Conflict'){
                      console.log("Error! ", data.error);
                      return;
                    }

                    scope.actionType = data.relationshipType;
                  });
                }
              }
            }
          }
        })
        .controller('clubController', clubController);

    function clubController($scope, $rootScope, $http, RouteHelpers, Flash, APP_APIS, ViewerService, AccountService, Upload) {
        if(!$rootScope.user)
          return;
      
        $scope.basepath = RouteHelpers.basepath;
        $scope.inMotion = false;
        $scope.loading = false;
        $scope.clubs = [];
        $scope.myClubs = ViewerService.cacheClubs();
        $scope.search_club = '';
        $scope.searchToken = '';
        $scope.bClubScrollDisabled = false;


        //----------------------------------------------------------------------------
        // Fill Out the Initial Clubs View for Membership and Relationships
        //----------------------------------------------------------------------------
        $scope.getClubs = function() {


            console.log("Get Clubs Called " + $scope.myClubs.length + "Loading " + $scope.loading + "Scroll "+ $scope.bClubScrollDisabled)

            if ( $scope.loading ) {
                return;
            }

            $scope.loading = true;

            if ( ! ViewerService.moreClubs() ) {
                $scope.loading = false;
                $scope.bClubScrollDisabled = true;
            } else {
                ViewerService.getClubs($rootScope.user.externalId).then(function (clubs) {
                    $scope.myClubs = clubs;
                    $scope.loading = false;
                    $scope.bClubScrollDisabled = true;
                }, function (error) {
                    console.log(error);
                    return;
                })
            }

        }

        // --------------------------------------------------------------------
        // Call Back Function for Image Upload - Used to update Account Panel
        // --------------------------------------------------------------------
        $scope.onComplete = function (creative) {


            var currAccount = ViewerService.setCurrentClub(creative.externalId);

            currAccount.accountLogoUrl  = creative.creatives.url;

            AccountService.updateAccount(currAccount).then(function (data) {
                console.log("Successful Update Account");
            }, function (error) {
                console.log(error);
                Flash.create('danger', 'Error! Problem Updating Image For The Account');
                return;
            })

        }


        //----------------------------------------------------------------------------
        // Search For Clubs
        //----------------------------------------------------------------------------
        $scope.searchClubs = function() {

          //---------------------------------------------------------//
          // Load Single Page Search
          //--------------------------------------------------------//
          if ( $scope.inMotion || ! AccountService.moreSearch($scope.searchToken) ) {
            //---------------------------------------------------------------
            // Check Cache Size of Controller if navigation has left the View
            //---------------------------------------------------------------
            if ( $scope.clubs.length < AccountService.searchCacheSize()) {
              $scope.clubs.length = 0;
              $scope.clubs = AccountService.cacheSearch();
            }
            return;
          }

          $scope.inMotion = true;
          $scope.loading = true;

          if ( ! AccountService.moreSearch($scope.searchToken) ) {
            $scope.loading = false;
            $scope.inMotion = true;
          } else {
            AccountService.searchAccounts($scope.searchToken,1,$scope.search_club, '6').then(function (searchRes) {
              $scope.clubs = AccountService.cacheSearch();
              $scope.loading = false;
              $scope.inMotion = false;
            }, function (error) {
              console.log(error);
              return;
            })
          }
        }

        // Search Clubs
        $scope.$watch('search_club', function(newVal){
          if(newVal != '' && newVal.length > 3) {
              $scope.searchToken='CLUB'+ new Date().getTime();
              $scope.search_club=newVal;
              $scope.searchClubs();
          }
        });

        //----------------------------------------------------------------------------
        // Set CLub into the View for Optional Creating A Relationship
        //----------------------------------------------------------------------------

        $scope.selectClub = function(club){

                for(var i in $scope.myClubs){
                if($scope.myClubs[i].account.externalId == club.externalId){
                  Flash.create('danger', 'Its Already Saved For You');
                  return;
                }
                }

                $scope.myClubs.push({account: club});

                ViewerService.addClubCache(club);

                  // Clear Search List
                  $scope.clubs = [];

        }

        //----------------------------------------------------------------------------
        // Remove a Club From Relationship and View
        //----------------------------------------------------------------------------
          $scope.$on('account', function(e, data){
            for(var i in $scope.myClubs){
              if(data == $scope.myClubs[i].account.externalId){
                $scope.myClubs.splice(i, 1);
              }
            }
          })        
    }

})();