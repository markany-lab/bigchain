# nvm 설치(ubuntu)
  ```bash
  $ sudo apt-get install build-essential libssl-dev
  $ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.4/install.sh | bash
  $ export NVM_DIR="$HOME/.nvm"
  $ [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  $ nvm install v8.9
  $ nvm alias default v8.9 #set default to v8.9
  $ npm install --global yarn
  $ sudo apt-get install python
  $ npm install -g truffle
  $ npm install -g express-generator
  $ npm install -g forever
  $ npm install -g nodemon
  ```

# nvm 설치(windows)
  ```bash
  $ nvm install v6.9.5
  $ nvm install v8.4
  $ nvm use v8.4
  $ npm install --global yarn
  $ npm install --global --production windows-build-tools # 관리자 권한으로 실행
  $ npm config set python C:\python27
  ```

# MetaMask 설치
- https://metamask.io/

# 테스트용 이더 발급
- http://rinkeby-faucet.com # 0.001 eth
  ```
  ex) 0xD53000e41163A892B4d83b19A2fEC184677a1272
  ```
- https://faucet.rinkeby.io/ # 최대 18.75 eth / 3days
  ```
  ex) https://www.facebook.com/laewook/posts/2084353508299956
  ```

# 프로젝트 코드 생성
- https://infura.io

# golang 설치
  ```bash
  $ vim ~/.bashrc
  ```
  ```
  export GOPATH="$HOME/gopath"
  export GOROOT="/opt/go"
  PATH=$GOROOT/bin:$GOPATH/bin:$PATH
  ```
  ```bash
  $ source ~/.bashrc
  $ export GO_VER=1.11.1
  $ export GO_URL=https://storage.googleapis.com/golang/go${GO_VER}.linux-amd64.tar.gz
  $ sudo mkdir -p $GOROOT
  $ sudo mkdir -p $GOPATH
  $ sudo curl -sL $GO_URL | (cd $GOROOT && sudo tar --strip-components 1 -xz)
  ```

# go-ethereum 설치
  ```bash
  $ d $GOPATH
  $ git clone https://github.com/ethereum/go-ethereum.git
  $ cd go-ethereum
  $ make geth
  $ vim ~/.bashrc
  ```
  ```
  PATH=$GOPATH/go-ethereum/build/bin/:$PATH
  ```
  ```bash
  $ source ~/.bashrc
  ```

# 프로젝트 초기화
  ```bash
  $./FirstNetwork.sh setup
  ```

# ipfs 설치
  ```bash
  $ go get -u -d github.com/ipfs/go-ipfs
  $ cd $GOPATH/src/github.com/ipfs/go-ipfs
  $ make install
  $ ipfs init
  $ ipfs daemon
  ```

# Loom Network 설치
  ```bash
  $ curl https://raw.githubusercontent.com/loomnetwork/loom-sdk-documentation/master/scripts/get_loom.sh | sh
  $ ./loom genkey -k priv_key -a pub_key > ./loc_addr
  $ ./loom init
  $ ./loom run
  ```

# Loom 샘플코드 실행
  ```bash
  $ git clone https://github.com/loomnetwork/truffle-dappchain-example
  $ cd truffle-dappchain-example
  $ cp ../priv_key extdev_private_key
  $ yarn install
  $ yarn deploy
  ```

# TENSORFLOW WITH ANACONDA 설치
- anaconda 다운로드 & 설치
  >https://www.anaconda.com/distribution/#download-section
  ```bash
  $ ./Anaconda2-2018.12-Linux-x86_64.sh
  $ source ~/.bashrc
  $ conda --version
  $ conda update conda
  ```
- anaconda에 가상환경 생성
  ```bash
  $ conda create --name TestVM python=2.7
  $ conda info --envs # 가상환경 리스트 확인
  $ conda activate TestVM # 가상환경 활성화
  $ conda deactivate # 가상환경 비활성화
  $ conda remove --name TestVM --all # 가상환경 삭제
  ```

- tensorflow 패키지 설치
  ```bash
  $ conda search tensorflow
  $ conda install tensorflow
  $ conda list
  #$ conda install --name TestVM tensorflow # 특정 가상환경에만 패키지를 설치
  #$ conda remove --name TestVM tensorflow # 패키지 제거
  ```

- 쥬비터 설치 & 실행(http://localhost:8081/)
  ```bash
  $ sudo apt-get install python-pip
  $ pip install --upgrade pip
  $ pip install jupyter
  $ nohup jupyter notebook --ip='*' & # 아나콘다의 활성화된 가상환경에서 쥬비터 실행
  ```

# TENSORFLOW 설치
  ```bash
  $ pip install tensorflow # GPU버전은 pip install tensorflow-gpu
  $ sudo apt-get install python-dev
  $ sudo apt-get install python-virtualenv
  $ virtualenv --system-site-packages -p python ~/tensorflow
  $ source ~/tensorflow/bin/activate
  ```
