const AWS = require('aws-sdk');
const s3 = new AWS.S3();

// Track cold start
let isColdStart = true;

// Upload Image Lambda Function
module.exports.uploadImage = async (event) => {
  const startTime = Date.now(); // Start time to measure execution duration

  // Check if it's a cold start
  const coldStartFlag = isColdStart;
  isColdStart = false; // After the first invocation, it's a warm start

  const body = JSON.parse(event.body);
  const imageData = Buffer.from(body.image, 'base64'); // Image data should be base64 encoded
  const fileName = body.fileName;

  const params = {
    Bucket: 's3-image-processing-api', // Replace with your bucket name
    Key: `uploads/${fileName}`,
    Body: imageData,
    ContentEncoding: 'base64', // Required for base64 encoded image
    ContentType: 'image/jpeg'  // Adjust if needed for other image types
  };

  try {
    await s3.putObject(params).promise();

    const endTime = Date.now(); // End time to measure execution duration
    const executionDuration = endTime - startTime; // Calculate duration

    // Log cold start, execution time
    console.log(`Execution duration: ${executionDuration}ms`);
    console.log(`Cold start: ${coldStartFlag}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image uploaded successfully',
        fileName,
        executionDuration: `${executionDuration}ms`,
        coldStart: coldStartFlag,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to upload image', error }),
    };
  }
};

// Process Image Lambda Function
module.exports.processImage = async (event) => {
  const startTime = Date.now(); // Start time to measure execution duration

  // Check if it's a cold start
  const coldStartFlag = isColdStart;
  isColdStart = false;

  const bucketName = event.Records[0].s3.bucket.name;
  const objectKey = event.Records[0].s3.object.key;

  try {
    // Get the uploaded image from S3
    const s3Object = await s3.getObject({
      Bucket: bucketName,
      Key: objectKey
    }).promise();

    const imageBuffer = s3Object.Body;

    // Log the image details (for now, no processing)
    console.log(`Received image: ${objectKey} with size: ${imageBuffer.length} bytes`);

    const newKey = objectKey.replace('uploads/', 'processed/');
    
    // Save the original image to processed folder (or any other logic)
    await s3.putObject({
      Bucket: bucketName,
      Key: newKey,
      Body: imageBuffer, // 
      ContentType: 'image/jpeg'
    }).promise();

    const endTime = Date.now(); // End time to measure execution duration
    const executionDuration = endTime - startTime; // Calculate duration

    // Log cold start, execution time
    console.log(`Execution duration: ${executionDuration}ms`);
    console.log(`Cold start: ${coldStartFlag}`);

    console.log(`Image processed and saved as ${newKey}`);

  } catch (error) {
    console.error(`Failed to process image ${objectKey}:`, error);
  }
};
