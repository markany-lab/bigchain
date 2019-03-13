# nvm 설치(ubuntu)
- $ sudo apt-get install build-essential libssl-dev
- $ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.4/install.sh | bash
- $ export NVM_DIR="$HOME/.nvm"
- $ [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
- $ nvm install v8.9
- $ nvm alias default v8.9 #set default to v8.9
- $ npm install --global yarn
- $ sudo apt-get install python
- $ npm install -g truffle
- $ npm install -g express-generator
- $ npm install -g forever
- $ npm install -g nodemon

# nvm 설치(windows)
- $ nvm install v6.9.5
- $ nvm install v8.4
- $ nvm use v8.4
- $ npm install --global yarn
- $ npm install --global --production windows-build-tools # 관리자 권한으로 실행
- $ npm config set python C:\python27

# golang 설치
- $ vim ~/.bashrc
  - > export GOPATH="$HOME/gopath"
  - > export GOROOT="/opt/go"
  - > PATH=$GOROOT/bin:$GOPATH/bin:$PATH
- $ source ~/.bashrc
- $ export GO_VER=1.11.1
- $ export GO_URL=https://storage.googleapis.com/golang/go${GO_VER}.linux-amd64.tar.gz
- $ sudo mkdir -p $GOROOT
- $ sudo curl -sL $GO_URL | (cd $GOROOT && sudo tar --strip-components 1 -xz)

# MetaMask 설치
 - https://metamask.io/

# 테스트용 이더 발급
- http://rinkeby-faucet.com # 0.001 eth
  - > ex) 0xD53000e41163A892B4d83b19A2fEC184677a1272
- https://faucet.rinkeby.io/ # 최대 18.75 eth / 3days
  - > ex) https://www.facebook.com/laewook/posts/2084353508299956

# 프로젝트 코드 생성
- https://infura.io
