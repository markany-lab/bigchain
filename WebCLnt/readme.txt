$ vim ../TruffLeBToken/rinkeby_api.token
+----+----+----+----+----+----
0123456789ABCDEF0123456789ABCDEF
+----+----+----+----+----+----

$ vim ../TruffLeBToken/rinkeby_private.key
+----+----+----+----+----+----
0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF
+----+----+----+----+----+----

$ vim ./src/rinkeby.json
+----+----+----+----+----+----
{"api_token":"0123456789ABCDEF0123456789ABCDEF","prv_key":"0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF"}
+----+----+----+----+----+----

$ ../FirstNetwork.sh setup
$ ../FirstNetwork.sh deploy_btoken_extdev
$ yarn serve
http://127.0.0.1:8080
