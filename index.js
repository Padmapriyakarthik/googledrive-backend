const baseurl="https://googledrive-client.herokuapp.com";

const express=require('express');
const app=express();
app.use(express.json());

require('dotenv').config();

const cors=require('cors');
app.use(cors());

const mongodb=require('mongodb');
const bcrypt=require('bcrypt');

const mongoClient=mongodb.MongoClient;
const objectId=mongodb.ObjectID;

const JWT = require("jsonwebtoken");
const JWT_SECRET =process.env.KEY;

const nodemailer=require('nodemailer');

const transporter=nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:'padmapriyakarthik97@gmail.com',
        pass:process.env.PASSWORD
    }
});

const dbUrl=process.env.DB_URL || "mongodb://127.0.0.1:27017";
const port=process.env.PORT || 4000;

let multer  = require('multer');
let upload  = multer({ storage: multer.memoryStorage() });
// Import required AWS SDK clients and commands for Node.js
const {
    S3Client,
    PutObjectCommand,
    CreateBucketCommand,
    ListBucketsCommand,
    ListObjectsCommand,
    GetObjectCommand
  } = require("@aws-sdk/client-s3");
  
  // Set the AWS region
  const REGION ="us-east-2";
  const s3 = new S3Client({ region: REGION,httpOptions: { timeout: 300000 } });
  // Set the bucket parameters
  const bucketName = "sampleupload";
  const bucketParams = { Bucket: bucketName };
  

// register user
app.post("/register", async (req,res)=>{
    
    const client = await mongoClient.connect(dbUrl);
    if(client){
        try {
            let {email}=req.body;
            const db = client.db("drive");
                const documentFind = await db.collection("users").findOne({email:req.body.email});
                if(documentFind){
                    res.status(400).json({
                        message:"User already Exists"
                    })
                }else{
                    let salt=await bcrypt.genSalt(10);//key to encrypt password
                    let hash=await bcrypt.hash(req.body.password,salt);
                    req.body.password=hash;
                    req.body.active=0;
                    let document=await db.collection("users").insertOne(req.body);
                    
                    if(document){ 
                        const token =  await JWT.sign({email},JWT_SECRET,)
                        let info = await transporter.sendMail({
                            from: 'padmapriyakarthik97@gmail.com', // sender address
                            to: req.body.email, // list of receivers
                            subject: "Hai!", // Subject line
                            html: 'Click <a href="https://googledrive-server.herokuapp.com/activate-user/' + token + '">here</a> to confirm your registration'
                          })
                        res.status(200).json({
                            "message":"activate your account via activation link sent to your mail"
                        })
                    }
                }
            client.close();
        } catch (error) {
            console.log(error);
            client.close();
        }
    }else{
        res.sendStatus(500);
    }
})

//activate users
app.get('/activate-user/:token',async(req,res)=>{
    const client = await mongoClient.connect(dbUrl);
    if(client){ 
        try{
            const db = client.db("drive");
            JWT.verify(req.params.token,
                JWT_SECRET,
                async(err,decode)=>{
                    if(decode!==undefined){
                        document=await db.collection("users").findOneAndUpdate({email:decode.email},{$set:{active:1}}); 
                        if(document)
                        {
                           //res.status(200).json({message:"Activated Sucessfully"});
                         res.redirect(baseurl+"/login");
                        }          
                    }else{
                        res.status(401).json({message:"invalid token"});
                    }
                });
            
            client.close();
        }
        catch(error)
        {
            console.log(error);
            client.close();
        }
    }else{

        res.sendStatus(500);
    }
})

//login
app.post("/login",async(req,res)=>{
    const client=await mongoClient.connect(dbUrl);
    if(client)
    {   const {email}=req.body;
        try{
            let db=client.db("drive");
            let data=await db.collection("users").findOne({email:req.body.email});
            if(data)
            {
                console.log(objectId(data._id).getTimestamp())
                let isvalid =await bcrypt.compare(req.body.password,data.password);   
                if(isvalid)
                {
                    if(data.active)
                    {
                        let token=await JWT.sign({email},JWT_SECRET)
                        let info = await transporter.sendMail({
                            from: 'padmapriyakarthik97@gmail.com', // sender address
                            to: req.body.email, // list of receivers
                            subject: "Hai!", // Subject line
                            html: "<h3>Hello "+data.firstname+"</h3><p>Welcome you have successfully loggedin</p>", // html body
                        })
                        console.log(info);
                        res.status(200).json({message:"Login Success",token,email});
                    }else{
                        res.status(400).json({message:"User Not Activated"});
                    }
                }
                else{
                    res.status(400).json({message:"Login Unsuccesful"})
                }
            }
            else{
                res.status(400).json({message:"User Does Not Exists "});// 401 unauthorized
            }
            client.close();
        }
        catch(error){
            console.log(error);
            client.close();
        }
    }else{

        res.sendStatus(500);
    }
})


app.post('/forgetpassword',async(req,res)=>{
    const client = await mongoClient.connect(dbUrl);

    if(client){
        const {email}=req.body 
        try{
            let db=client.db("drive");
            let data=await db.collection("users").findOne({email:req.body.email});
            if(data)
            {
            const dummytoken =  await JWT.sign({email},JWT_SECRET,)
                        let info = await transporter.sendMail({
                            from: 'padmapriyakarthik97@gmail.com', // sender address
                            to: req.body.email, // list of receivers
                            subject: "Hai!", // Subject line
                            html: 'Click <a href="https://googledrive-server.herokuapp.com/activate-password/' + dummytoken + '">here</a> to reset your password'
                          })
                        if(dummytoken)
                        {
                           res.status(200).json({message:"an email is sent for changing the password",dummytoken});
                        }
            }else{
                res.status(400).json({message:"Email does not exist"});
            }

        }
        catch(error)
        {
            console.log(error);
            client.close();
        }
    }else{

        res.sendStatus(500);
    }
})


app.get('/activate-password/:token',async(req,res)=>{
    const client = await mongoClient.connect(dbUrl);
    if(client){ 
        try{
            const db = client.db("drive");
            JWT.verify(req.params.token,
                JWT_SECRET,
                async(err,decode)=>{
                    if(decode!==undefined){
                        
                        document=await db.collection("users").findOneAndUpdate({email:decode.email},{$set:{password:req.params.token}}); 
                        if(document)
                        {
                            //res.status(200).json({message:"password reset link Activated Sucessfully"});
                           res.redirect(baseurl+"/Password");
                        
                        }          
                    }else{
                        res.status(401).json({message:"invalid token"});
                    }
                });
            
            client.close();
        }
        catch(error)
        {
            console.log(error);
            client.close();
        }
    }else{

        res.sendStatus(500);
    }
})

app.post('/updatepassword',async(req,res)=>{
    const client = await mongoClient.connect(dbUrl);
    if(client){ 
        try{
            if(req.headers.authorization)
            {
                const db = client.db("drive");
            let salt=await bcrypt.genSalt(10);//key to encrypt password
                        console.log(salt);
            let hash=await bcrypt.hash(req.body.password,salt);
                        req.body.password=hash;
            JWT.verify(req.headers.authorization,
                JWT_SECRET,
                async(err,decode)=>{
                    if(decode!==undefined){
                        document=await db.collection("users").findOneAndUpdate({email:decode.email},{$set:{password:req.body.password}}); 
                        if(document)
                        {
                            res.status(200).json({message:"password updated"});
                          //  res.redirect(baseurl+"/password");
                        
                        }          
                    }else{
                        res.status(401).json({message:"invalid token"});
                    }
                });
            
            client.close();
        }else{
            res.status(401).json({message:"No token for Authorization"});
        }
        }
        catch(error)
        {
            console.log(error);
            client.close();
        }
    }else{

        res.sendStatus(500);
    }

})

app.post('/upload', upload.single('somefile'),authenticate, async (req, res) => {
   // console.log(req.file.originalname);
    //console.log(req.file.buffer.toString('utf8'));
    req.body.filename=req.file.originalname;  
   key=req.body.email+"_"+req.file.originalname;
   body=req.file.buffer.toString('utf8')
    console.log(req.body);
    const objectParams = { Bucket: bucketName, Key:key, Body:body};
    try {
      const results = await s3.send(new PutObjectCommand(objectParams));
      console.log("Successfully uploaded data to " + bucketName + "/" + key);
      const {httpStatusCode}=results.$metadata;
    if(httpStatusCode==200)
    {   
        const client = await mongoClient.connect(dbUrl);
        if(client){
            try {
                const {shorturl}=req.body;
               
               // console.log(url);
                const db = client.db("drive");
                const document = await db.collection("documents").insertOne({email:req.body.email,awskeyname:key,filename:req.file.originalname});
                console.log(document);
                if(document){
                    
                    res.status(200).json({
                        "message":"record updated"
                    })
                }
                else
                {
                    res.status(200).json({"message":"Upload failed check your file"});
                }
                client.close();
            } catch (error) {
                console.log(error);
                client.close();
            }
        }
        else{
            res.sendStatus(500);
        }

    }else{
        res.status(200).json({message:"Upload failed"});
    }
      console.log(httpStatusCode);
    } catch (err) {
      console.log("Error", err);
    }

});

app.get("/getfile",authenticate,async(req,res)=>{

    const client = await mongoClient.connect(dbUrl);
        if(client){
            try {

                const db = client.db("drive");
                const document = await db.collection("documents").find({email:req.body.email}).project({filename:1,_id:0}).toArray();
            
                if(document){
                    
                    res.status(200).json({message:"file listed",document})
                }
                else
                {
                    res.status(200).json({message:"no files to list"});
                }
                client.close();
            } catch (error) {
                console.log(error);
                client.close();
            }
        }
        else{
            res.sendStatus(500);
        }

})
app.get("/file:filename",authenticate,async(req,res)=>{


})
app.listen(port,()=>{console.log("App Started",port)})

async function authenticate(req,res,next){

    console.log(req.headers.authorization);
        if(req.headers.authorization!==undefined)
        {
            JWT.verify(req.headers.authorization,
                JWT_SECRET,
                (err,decode)=>{
                    if(decode!==undefined){
                        console.log(decode);
                        req.body.email=decode.email;
                        next();
                    }else{
                        res.status(401).json({message:"invalid token"});
                    }
                });
        }else{
            res.status(401).json({message:"No token"})
        }
}

const run = async (key,body) => {

    const objectParams = { Bucket: bucketName, Key:key, Body:body};
    try {
      const results = await s3.send(new PutObjectCommand(objectParams));
      console.log("Successfully uploaded data to " + bucketName + "/" + key);
      const {httpStatusCode}=results.$metadata;

      console.log(httpStatusCode);
    } catch (err) {
      console.log("Error", err);
    }
  };    


  const run1 = async () => {
    try {
      const data = await s3.send(new ListBucketsCommand({}));
      console.log("Success", data.Buckets);
    } catch (err) {
      console.log("Error", err);
    }
  };