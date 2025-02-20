const fs = require("fs");
const path = require("path");
const { initializeApp } =  require("firebase/app");
const { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } =  require("firebase/storage");

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.apiKey,
    authDomain: process.env.authDomain,
    projectId: process.env.projectId,
    storageBucket: process.env.storageBucket,
    messagingSenderId: process.env.messagingSenderId,
    appId: process.env.appId,
    measurementId: process.env.measurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Upload File on firebase
module.exports.uploadFileOnFirebase = async ({path = "", file = null, type ="add", uploadType = 'generate'}) => {
    try{
        if(type === 'add'){
            const dateTime = (+new Date())
            const metadata = {
                contentType : file.mimetype
            }
            const name = file.originalname.replaceAll(' ', '_');
            const storageRef = ref(storage, path+'/'+name+' '+dateTime);
            const fileValue = uploadType === 'upload' ? file.buffer : file.file;
            const snapshot = await uploadBytesResumable(storageRef, fileValue, metadata);
            const filePath = await getDownloadURL(snapshot.ref);
            return ({url: filePath, name});
        } else {
            const desertRef = ref(storage, '/users'+path);

            const res = await deleteObject(desertRef).then(() => {
                // File deleted successfully
                return ({message: 'Image Removed Successfully'});
            }).catch((error) => {
                return error;
            });
            return res;
        }
    }
    catch(e){
        // console.log('e-----', e)
        return e
    }
}

// Deploy to Firebase Hosting
// You can deploy now or later. To deploy now, open a terminal window, then navigate to or create a root directory for your web app.

// Sign in to Google
// firebase login
// Initiate your project
// Run this command from your app’s root directory:

// firebase init
// When you’re ready, deploy your web app
// Put your static files (e.g., HTML, CSS, JS) in your app’s deploy directory (the default is “public”). Then, run this command from your app’s root directory:

// firebase deploy