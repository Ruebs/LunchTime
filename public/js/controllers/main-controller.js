lunchtimeApp.controller('mainController', ['$scope', '$firebaseObject', '$firebaseArray', '$http', function($scope, $firebaseObject, $firebaseArray, $http) {

    $(document).keypress(function(e) {
        if (e.which == 13 && $scope.showLogin) {
            $("#loginButton").click();
        }
    });

    FirebaseService.onAuthChange(function(user) {
        if (user) {
            $scope.user = user;
            $scope.noUser = false;
            $scope.showLogin = false;
            $scope.$apply();
            navigateToIndex();
        } else {
            $scope.showLogin = true;
        }
    });

    function navigateToIndex() {
        $scope.uid = FirebaseService.getUserUid();
        $scope.isAdmin = ($scope.uid == '39QJFGuGPJcHTbWdXcHJNdjm9G93' || $scope.uid == 'nnxIliPytTVv4GByuTN4gkJTq0L2' || $scope.uid == 'uZVyqWskGneWmTdv71ZE7iNwdPg2');
        $scope.emailVerified = FirebaseService.getEmailVerified();
        $scope.$apply();

        FirebaseService.getRef('LunchSources').on('value', function(dataSnapshot) {
            if (dataSnapshot.val()) {
                $scope.lunchSources = dataSnapshot.val();

                $scope.lunchSourcesArr = [];

                angular.forEach($scope.lunchSources, function(value, key) {
                    if (value.Votes) {
                        value.VotesLength = Object.keys(value.Votes).length;
                    } else {
                        value.VotesLength = 0;
                    }
                    $scope.lunchSourcesArr.push({ key, value });
                });

                $scope.lunchSourcesArr = $scope.lunchSourcesArr.sort(function(a, b) {
                    if (a.value.LastOrdered == b.value.LastOrdered) { return a.key.replace(' ', '') < b.key.replace(' ', '') ? -1 : 1; } else { return a.value.LastOrdered < b.value.LastOrdered ? -1 : 1 }
                });
            }
        }, function(error) {
            $scope.emailVerified = false;
        });
        $scope.$apply();

        FirebaseService.getRef('ThisWeeksWinner').on('value', function(dataSnapshot) {
            if (dataSnapshot.val()) {
                $scope.thisWeeksWinner = dataSnapshot.val();
            }
        });
        $scope.$apply();

        setTimeout(function() {

            $scope.hideLogo = true;
            $scope.$apply();

            setTimeout(function() {
                $scope.pageLoaded = true;
                $scope.$apply();
            }, 600);

        }, 1200);
    }

    $scope.continue = function() {
        $scope.logout();
    };

    function validateUserPassword(user, password) {
        if (!user || user.indexOf('@') < 1 || user.indexOf('.') < 1) {
            alert('Invalid email');
            return false;
        }

        if (!password) {
            alert('Invalid password');
            return false;
        }

        return true;
    }

    $scope.resetInputs = function(u, p) {
        u = null;
        p = null;
    };

    $scope.login = function(username, password) {
        if (validateUserPassword(username, password)) {

            FirebaseService.login(username, password, function(user) {});
        }
    };

    $scope.register = function(username, password) {
        if (validateUserPassword(username, password)) {

            FirebaseService.registerUser(username, password, function(user) {
                $scope.user = user;
                $scope.noUser = false;
                $scope.sendVerificationEmail();
                navigateToIndex();
            });
        }
    };

    $scope.logout = function() {
        FirebaseService.logout(function() {
            $scope.pageLoaded = false;
            $scope.hideLogo = false;
            $scope.showLogin = true;
            $scope.noUser = true;
            $scope.user = null;
            $scope.resetInputs();
            $scope.$apply();
        });
    };

    $scope.tabs = {
        active: "Vote",
        all: ["Vote", "Results", "Manage"]
    }

    $scope.setActiveTab = function($tabNumber) {

        $scope.tabs.active = $scope.tabs.all[$tabNumber];

    }

    $scope.vote = function(key, value, indexWithinCount) {
        if ((value.LastOrdered == 0 || indexWithinCount) && (!value.Premium || !$scope.premiumOnCooldown())) {

            FirebaseService.getRef('LunchSources/' + key + '/Votes/' + $scope.uid).once('value', function(dataSnapshot) {
                if (dataSnapshot.val()) {
                    FirebaseService.getRef('LunchSources/' + key + '/Votes/' + $scope.uid).remove();
                } else {
                    FirebaseService.getRef('LunchSources/' + key + '/Votes/' + $scope.uid).set(true, function(data) {});
                }
            });
        }
    }

    $scope.checkIfVoted = function(value) {

        return ($scope.uid in value.Votes);
    }

    $scope.addNewOption = function(name, url, useGeneric) {
        if (!useGeneric && url) {
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';
            xhr.onload = function() {
                xhr.response; // xhr.response is a blob
                var re = /(?:\.([^.]+))?$/;
                var picName = name.replace(/'s'/g, '_') + re.exec(url)[0];
                _firebase.storage().ref(picName).put(xhr.response).then(function(dataSnapshot) {
                    FirebaseService.getRef('LunchSources/' + name).set({ LastOrdered: '0', Logo: dataSnapshot.downloadURL });
                    $scope.$digest();
                }, function(dataError) {
                    alert('Upload failed.');
                });
            };
            xhr.open('GET', url);
            xhr.send();
        } else {
            FirebaseService.getRef('LunchSources/' + name).set({ LastOrdered: '0', Logo: 'resources/images/lunchtime_logo.png' });
        }
    }

    $scope.deleteOption = function(name) {
        if (confirm("Are you sure you want to delete the " + name + " option?")) {
            FirebaseService.getRef('LunchSources/' + name).remove();
        }
    }

    $scope.recordAndReset = function() {
        if (confirm("Are you sure you want to record the winner and reset all of the votes?")) {
            var max = { key: 'N/A', value: { Votes: {} } };

            var i = 0,
                numOptions = $scope.lunchSourcesArr.length;

            for (; i != numOptions; ++i) {
                if ($scope.lunchSourcesArr[i].value.Votes && Object.keys($scope.lunchSourcesArr[i].value.Votes).length > Object.keys(max.value.Votes).length) {
                    max = $scope.lunchSourcesArr[i];
                }
            }

            FirebaseService.getRef('ThisWeeksWinner').set(max.key);

            var today = new Date();
            var year = today.getFullYear();
            var month = today.getMonth() + 1;
            if (month < 10) { month = '0' + month; }
            var day = today.getDate();
            if (day < 10) { day = '0' + day; }

            if (max.value.LastOrdered) {
                FirebaseService.getRef('LunchSources/' + max.key + '/LastOrdered').set(year + '' + month + '' + day);
            }

            var updates = {};

            angular.forEach($scope.lunchSources, function(value, key) {
                updates[key + '/Votes'] = {};
            });

            FirebaseService.getRef('/LunchSources').update(updates);
        }
    }

    $scope.sendVerificationEmail = function() {
        FirebaseService.getUser().sendEmailVerification();
        alert('Verification email has been sent.');
    }

    $scope.submitVotes = function() {
        alert('Your vote(s) have been recorded.')
    }

    $scope.premiumOnCooldown = function() {

        if (!$scope.lunchSourcesArr) {
            return false;
        }

        var today = new Date();
        var year = today.getFullYear();
        var month = today.getMonth() + 1;
        if (month < 10) { month = '0' + month; }
        var day = today.getDate();
        if (day < 10) { day = '0' + day; }

        var date = year * 10000 + month * 100 + day;

        if ($scope.lunchSourcesArr[$scope.lunchSourcesArr.length - 3].value.Premium === true && ((date - $scope.lunchSourcesArr[$scope.lunchSourcesArr.length - 3].value.LastOrdered) <= 28)) {
            return true;
        }

        if ($scope.lunchSourcesArr[$scope.lunchSourcesArr.length - 2].value.Premium === true && ((date - $scope.lunchSourcesArr[$scope.lunchSourcesArr.length - 2].value.LastOrdered) <= 28)) {
            return true;
        }

        if ($scope.lunchSourcesArr[$scope.lunchSourcesArr.length - 1].value.Premium === true && ((date - $scope.lunchSourcesArr[$scope.lunchSourcesArr.length - 1].value.LastOrdered) <= 28)) {
            return true;
        }

        return false;
    }
}]);