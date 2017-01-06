// Initialize Firebase
const config = {
    apiKey: "AIzaSyA8ajbsD5eQyKgMPI11dwLC1wk1lsaYE04",
    authDomain: "lunchtime-6fa94.firebaseapp.com",
    databaseURL: "https://lunchtime-6fa94.firebaseio.com",
    storageBucket: "lunchtime-6fa94.appspot.com",
    messagingSenderId: "150277644127"
};
var _firebase = firebase.initializeApp(config);

function createUserStore(user) {
    _firebase.database().ref('userData/' + user.uid).set({
        email: user.email,
        config: {
            state: 'Inactive'
        },
        nutrients: {},
        schedule: {},
        stream: 'temp/' + user.uid + '.jpg'
    });
}

var FirebaseService = {

    getRef: function(child) {
        return _firebase.database().ref(child);
    },

    getUserUid: function(child) {
        return _firebase.auth().currentUser.uid;
    },

    getEmailVerified: function(child) {
        return _firebase.auth().currentUser.emailVerified;
    },

    getConfigRef: function() {
        return _firebase.database().ref('/LunchtimeConfig');
    },

    getUserData: function(callback) {
        return _firebase.database().ref('/userData/' + _firebase.auth().currentUser.uid).once('value')
            .then(function(data) {
                callback(data);
            });
    },

    onAuthChange: function listener(listener) {
        _firebase.auth().onAuthStateChanged(listener).bind(firebase);
    },

    getUser: function() {
        return _firebase.auth().currentUser;
    },

    login: function(user, password, callback) {
        _firebase.auth().signInWithEmailAndPassword(user, password)
            .then(function(user) {
                callback(user);
            })
            .catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                alert(error.message);
            });
    },

    registerUser: function(username, password, callback) {
        _firebase.auth().createUserWithEmailAndPassword(username, password)
            .then(function(user) {
                createUserStore(user);
                callback(user);
            })
            .catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                alert(error.message);
            });
    },

    logout: function(callback) {
        _firebase.auth().signOut()
            .then(function() {
                callback();
            }, function(error) {
                console.log('ERROR: ' + error)
            });
    }
};