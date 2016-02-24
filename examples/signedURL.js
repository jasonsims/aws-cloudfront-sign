var cfUtil = require('aws-cloudfront-sign');

// Sample private key. This would need to be replaced with the private key from
// your CloudFront key pair.
var cfPk =
'-----BEGIN RSA PRIVATE KEY-----\n' +
'MIIEogIBAAKCAQEAgBmGbFU3bxnZpqMQ2LwmFP4lq7RauurKCF623Snm1XGNQuF9\n' +
'XqDeK3TH3ZfYC6P4iQ+C+Ynw15UP/MGbULO2UCmLfkA30FyI/u46jdhdD7hvMqEj\n' +
'UOEBxVJGFhqrZyerd9A7dRqYS6DTbaz3Vb+aGNcBLuqPP9/TydkkqoFqQnft43W7\n' +
'mWPp7Cx+TDkY/untwF3TWJdiAeke3FBAB2mni+BlmrNQs3vfufhW2XMV8sSOY+cN\n' +
'7chQmruV1stS+KCGiFfkiel824KI/1yVUe7+ofDGJF7v1G6WD4XV2sBAz01EIWSK\n' +
'vo1txA1lSoRcFHmnNOB4d8dKncilxEjstq6J5QIDAQABAoIBAC/m26CJIUiXdw9c\n' +
'LQGPIgJ5oyaZM9Bv2grVODZt49bvNm7LGYqAZNmuOmzIhLk12+Lzbo7hV+Vp908G\n' +
'znfj3zT6Ucmu9nFDuKibMq+hZIg/30VnS0AcU+gwwuqjIHNbn0AXixRYVJj7U/TQ\n' +
'WFEla/9b7yJXLigpj+4MGCz2ZgDifr3YrCLucqozHagFf7apJ0xguqG7dYqOIrnp\n' +
'67CzIc/U76qkT/hVMwlC6Kl3VJg2nIIsQQv73bi0MLr4VzMl7ca+h7iCoGuZOBOn\n' +
'vbRyFnfQW0Dr07THHmgQvCZiIE4PkHk2hgTA0yVFFkYOZ6z6xyqoT8Qs+eUVGXCP\n' +
'Au5h6WECgYEA/fjlmzHgMnyfsCugmd/Qbh4tyDVBET6jKKG/JI/K43DjTTLWthcx\n' +
'Rlse1B6L3fPiaLyNiLQWwdLnH/KHuVEY1om6eTO7WQLAEtTUOngsXms33ZdHtzIj\n' +
'r6UW9yqiDG6wNHH3Ql8oJCMaKs8z/mrcPJut0JORLmqd68NeOyxeIi0CgYEAgR9a\n' +
'TG2L06zJZ2Zk6sFee/4nZ5HgMHavxt25/JJtLG4Rew/lb1N10QcSk3v4I7bl41uB\n' +
'QhlHfyYd1yb0a2iTckW/5OZA1oRHliP/Vx95NS0ti3tO1hsuPKVTrMTEpEB2lul3\n' +
'BQuZehOE9HCW2QlDnwBeM2SDA0kagknIh63XsZkCgYBgEkIQxfowPvJNOwOikYaP\n' +
'0TyySmrVsiMYIK9kjjxKcw6Yyk1sTjOk9FkWYP3SwHqfEs0L4hSn6u3F9/34bp+N\n' +
'fmtkUTW0WK3G0jtYV5XiegCEvZnelmxe9g1M7ESmfUyMWjwVUFen69tfLEhXymaL\n' +
'SryidN/rdgtM/vdrXOoy9QKBgAks4izGKAZ9o74uP4OTBBTJhaFNc2HePTVjciDp\n' +
'gsqCc8mL4qDbjGazGvXR/FsFVyalzPaddcweu0kaziZdm36Z1JPI4o1fMUijtVax\n' +
'voXJvfjVtWGgAbgj05NayZohX/14B9YG8fwDwRHhokZ/6wc0bn02ajzkh/a0KYTC\n' +
'rK4ZAoGAGqYbrwHYFFgAOhOaPdER9jK+MXWl1pUhdFTUbNETgF0Nay06GifY+1DA\n' +
'oTu2hg3k7z5464WANk/ixn5nlyRD/i8Ab4ENA56sFly9qOyEdWlXKNrocMd4wjJr\n' +
'ZVF3wvEieF2E1PTySKYNb0ZUm70nfzMj6sRFw9ow58LdpPVXIew=\n' +
'-----END RSA PRIVATE KEY-----'
// Sample key pair ID. This would need to be replaced by the Access Key ID from
// your CloudFront key pair.
var cfKeypairId = 'APKAJM2FEVTI7BNPCY4A';
var cfURL = 'http://xxxxxxx.cloudfront.net/path/to/s3/object';

var signedUrl = cfUtil.getSignedUrl(cfURL, {
  keypairId: cfKeypairId,
  expireTime: Date.now() + 60000,
  privateKeyString: cfPk
});

console.log(signedUrl);
