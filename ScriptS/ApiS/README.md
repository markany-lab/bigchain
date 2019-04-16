# 온체인 APIs
  - 아래 API들은 commander npm 모듈을 이용하여 생성한 것임
  - 실행 전 모듈을 설치하기 위해 "yarn" 명령어 입력
  - "node app.js 명령어 --옵션 --파라미터이름 파라미터" 형태로 사용

## account
    - 계정 관련 API
    - 옵션
      * generate: 계정 생성
      * import: 계정 가져오기
      * export: 개인키 내보내기
      * remove: 계정 삭제
      * list: 계정 목록
      * balance: 계정 잔고
    - 파라미터
      * address: 사용할 계정의 주소
      * password: 계정의 패스워드
      * privateKey: 개인키

#### generate
  - 이더리움 계정 생성
  - 사이드체인 계정 생성
  - 이더리움 계정과 사이드체인 계정 연동
  - 사용 예
  ```bash
  $ node app.js account --generate --password <password>
  $ node app.js account --generate --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  {
    "state": "new",
    "ethAddress": "0xc7cf04aa9a7a6d548e6d1dac8f7401f4a36ad32b",
    "dappAddress": "0x0d78440188459bbf880fb98e60f8fdfbd9c8057b"
  }
        ```

#### list
  - 이더리움 계정 리스트를 반환
  - 사용 예
  ``` bash
  $ node app.js account --list
  ```
  - 리턴 예
  ```json
  {
    "list": ["1ee77618b9e4f7651381e2ede71b0d389f27a5c6", "9f5b09c73d678aed01475c2689b7d136249636b3"]
  }
  ```

#### import
  - 이더리움 개인키를 받아 계정을 불러오기
  - 사이드체인 계정 생성
  - 이더리움 계정과 사이드체인 계정 연동
  - 사용 예
  ```bash
  $ node app.js account --import --password <password> --privateKey <privateKey>
  $ node app.js account --import --password p@ssw0rd --privateKey 0x4E97E81D425966C00422A8FC5602382DA74862A239E941B2777AB0CB968D115B
  ```
  - 리턴 예
  ```json
  {
    "state": "exists",
    "ethAddress": "0x1EE77618B9E4F7651381E2EDE71B0D389F27A5C6",
    "dappAddress": "0xF2869F974A82EB59DF913353882D40BD186CF353"
  }
  ```

#### export
  - 선택한 계정의 개인키 내보내기
  - index는 이더리움 list의 인덱스를 뜻함
  - 사용 예
  ```bash
  $ node app.js account --export --address <address> --password <password>
  $ node app.js account --export --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  {
    "privateKey": "0x4e97e81d425966c02422a8fc5602382da73862a239e941b2b77ab0cb968d115a"
  }
  ```

#### remove
  - 선택한 계정 삭제
  - 사용 예
  ``` bash
  $ node app.js account --remove --address <address>
  $ node app.js account --remove --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6
  ```
  - 리턴 예
  ```json
  {
    "remove": "UTC--2019-03-27T01-45-37.310Z--9f5b09c73d678aed01475c2689b7d136249636b3"
  }
  ```

#### balance
  - 선택한 계정의 잔고 표시
  - 이더리움 잔고 표시
  - 사이드체인 잔고 표시
  - 사용 예
  ```bash
  $ node app.js account --balance --address <address> --password <password>
  $ node app.js account --balance --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  {
    "ethAddress": "0x1ee77618b9e4f7651381e2ede71b0d389f27a5c6",
    "ethBalance": "28704743207976984542",
    "dappBalance": "5fec5b60eeb9f4"
  }
  ```

## send
  - 계정 생성시 매핑된 이더리움 계정과 사이드체인 계정간의 이더 전송 API
  - 옵션
    * ethereum: 이더리움 계정에서 사이드체인 계정으로 이더 전송
    * dappchain: 사이드체인 계정에서 이더리움 게이트웨이로 이더 전송
    * withdraw: 이더리움 게이트웨이에서 이더리움 계정으로 이더 전송
  - 파라미터
    * index: 계정의 index(list 명령어 결과의 순서)
    * password: 계정의 패스워드
    * amount: 전송할 이더의 양
    * unit: 전송할 이더의 단위


#### ethereum
  - 메잇넷에서 사이드체인으로 이더 전송
  - 사용 예
  ```bash
  $ node app.js send --ethereum --index <index> --password <password> --unit <unit> --amount <amount>
  $ node app.js send --ethereum --index 0 --password p@ssw0rd --unit ether --amount 0.01
  ```
  - 리턴 예
  ```json
  {
    "ethAddress": "0x1ee77618b9e4f7651381e2ede71b0d389f27a5c6",
    "balanceBefore": "28704743207976984542",
    "balanceAfter": "28694720829976984542"
  }
  ```

#### dappchain
  - 사이드체인에서 메인넷 게이트웨이로 이더 전송
  - 사용 예
  ``` bash
  $ node app.js send --dappchain --index <index> --password <password> -unit <unit> --amount <amount>
  $ node app.js send --dappchain --index 0 --password p@ssw0rd --unit ether --amount 0.01
  ```
  - 리턴 예
  ```json
  {
    "send":"10000000000000000"
  }
  ```

#### withdraw
  - 메인넷 게이트웨이에서 이더리움으로 이더 전송
  - 사용 예
  ``` bash
  $ node app.js send --withdraw --index <index> --password <password>
  $ node app.js send --withdraw --index 0 --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  {
    "withdraw":10000000000000000
  }
  ```

## msp
  - 멤버십 관련 (임시) API
  - 사용자가 역할(패키저, 컨텐츠 제공자, 스토리지 제공자, 유통업자) 요청
  - 컨트랙트 오너가 요청 리스트 확인 후 승인 / 거부
  - 옵션
    * request: 역할 요청
    * details: (컨트랙트 오너) 모든 역할 요청 리스트 확인
    * approve: (컨트랙트 오너) 역할 요청의 승인 / 거부
    * revoke: (컨트랙트 오너) 사용자 역할 취소
    * clean: (컨트랙트 오너) 역할 요청 cleanup
    * verify: 사용자의 역할 확인
    * test: (테스트용) 기타 API를 사용하기 위한 최소한의 역할 부여
  - 파라미터
    * address: 사용할 계정의 주소
    * password: 계정의 패스워드
    * role: 역할(P: 패키저 / CP: 컨텐츠 제공자 / SP: 스토리지 제공자 / D: 유통업자)
    * approve: 승인 / 거부
    * target: 대상 계정

#### request
  - 역할 요청
  - 사용 예
  ``` bash
  $ node app.js msp --request --address <address> --password <password> --role <role>
  $ node app.js msp --request --address 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --password p@ssw0rd --role P
  ```
  - 리턴 예
  ```json
  {
    "result":"succeed"
  }
  ```

#### details
  - 아직 처리되지 않은 역할 요청 리스트 확인
  - 컨트랙트 오너만 사용 (타 계정 사용시 오류 발생)
  - 사용 예
  ``` bash
  $ node app.js msp --details --address <address> --password <password>
  $ node app.js msp --details --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  [{
    "index": 2,
    "requester": "0x62D7Ccd417C90F63860c1DAb3Bc421fa06DD2e52",
    "role": "Packager"
  }, {
    "index": 3,
    "requester": "0x62D7Ccd417C90F63860c1DAb3Bc421fa06DD2e52",
    "role": "ContentsProvider"
  }, {
    "index": 4,
    "requester": "0x62D7Ccd417C90F63860c1DAb3Bc421fa06DD2e52",
    "role": "StorageProvider"
  }, {
    "index": 5,
    "requester": "0x62D7Ccd417C90F63860c1DAb3Bc421fa06DD2e52",
    "role": "Distributor"
  }]
  ```

#### approve
  - 역할 요청 승인 / 거부
  - 컨트랙트 오너만 사용 (타 계정 사용시 오류 발생)
  - 0: 거부 / 1: 실패
  - ','을 이용하여 여러 요청 처리 (예: 1,1,0,1: 승인, 승인, 거부, 승인)
  - details 커맨드 결과의 순서대로 처리
  - 사용 예
  ``` bash
  $ node app.js msp --approve --address <address> --password <password> --approval <approval>
  $ node app.js msp --approve --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --approval 1,1,0,1
  ```
  - 리턴 예
  ```json
  {
    "result":"succeed"
  }
  ```

#### revoke
  - 사용자 역할 취소
  - 컨트랙트 오너만 사용 (타 계정 사용시 오류 발생)
  - 사용 예
  ``` bash
  $ node app.js msp --revoke --address <address> --password <password --target <target> --role <role>
  $ node app.js msp --revoke --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --target 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --role P
  ```
  - 리턴 예
  ```json
  {
    "result":"succeed"
  }
  ```

#### verify
  - 사용자 역할 확인
  - true / false로 리턴
  - 사용 예
  ``` bash
  $ node app.js msp --revoke --address <address> --password <password --target <target> --role <role>
  $ node app.js msp --revoke --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --target 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --role P
  ```
  - 리턴 예
  ```json
  {
    "verify":"true"
  }
  ```

#### clean
  - 역할 요청 cleanup
  - 컨트랙트 오너만 사용 (타 계정 사용시 오류 발생)
  - 사용 예
  ``` bash
  $ node app.js msp --clean --address <address> --password <password>
  $ node app.js msp --clean --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  {
    "result":"succeed"
  }
  ```

## cid
  - CID 생성 API
  - 옵션: 없음
  - 파라미터
    * address: 사용할 계정의 주소
    * password: 계정의 패스워드
  - 사용 예
  ``` bash
  $ node app.js cid --address <address> --password <password>
  $ node app.js cid --address 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  {
    "cid":"0"
  }
  ```

## regist
  - 등록 관련 API
  - 데이터 등록 / 파일 등록 / 상품 등록 / 상품 구입 / 채널 개설 / 채널 폐쇄 / 채널 정산
  - 옵션
    * data: 데이터 등록
    * file: 파일 등록
    * product: 상품 등록
    * buy: 상품 구입
    * open: 채널 개설
    * off: 채널 폐쇄
    * settle: 채널 정산
  - 파라미터
    * address: 사용할 계정의 주소
    * password: 계정의 패스워드
    * cid: 데이터 CID
    * ccid: 데이터 CCID
    * version: 데이터 버전
    * category: 데이터 카테고리
    * subCategory: 데이터 서브 카테고리
    * title: 데이터 이륾
    * details: 데이터 상세(파일 정보)
    * filePath: 파일 경로
    * fee: 가격
    * chunks: 파일 청크 수
    * id: 각종 ID(데이터 ID, 상품 ID, 토큰 ID, 채널 ID)
    * senders: 데이터 송신자 목록(정산시 사용)

#### data
  - 데이터 등록
  - 패키저 혹은 컨텐츠 제공자만 호출 가능
  - CID 생성 API를 사용한 계정만이 그 결과로 나온 CID 사용 가능
  - 등록 성공시 데이터 ID 반환
  - 사용 예
  ``` bash
  $ node app.js regist --data --address <address> --password <password> --cid <cid> --ccid <ccid> --version <version> --category <category> --subCategory <subCategory> --title <title> --details <details>
  $ node app.js regist --data --address 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --password p@ssw0rd --cid 0 --ccid 01020304 --version v0.7 --category movie --subCategory commercial --title avengers --details '{\"./file_path/subtitle.txt\":\"subtitle\",\"./file_path/movie.avi\":\"movie\"}'
  ```
  - 리턴 예
  ```json
  {
    "data_id":"0"
  }
  ```

#### file
  - 파일 등록(가격, 청크 수)
  - 컨텐츠 제공자만 호출 가능
  - 데이터의 주인만이 파일 등록 가능
  - 등록 성공시 데이터 ID 반환
  - 사용 예
  ``` bash
  $ node app.js regist --file --address <address> --password <password> --ccid <ccid> --version <version> --filePath <filePath> --fee <fee> --chunks <chunks>
  $ node app.js regist --file --address 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --password p@ssw0rd --ccid 01020304 --version v0.7 --filePath ./file_path/movie.avi --fee 50000 --chunks 10240
  ```
  - 리턴 예
  ```json
  {
    "result":"succeed"
  }
  ```

#### product
  - 상품 등록
  - 유통업자만 호출 가능
  - 등록 성공시 상품 ID 반환
  - 사용 예
  ``` bash
  $ node app.js regist --product --address <address> --password <password> --ccid <ccid> --version <version> --filePath <filePath> --fee <fee>
  $ node app.js regist --product --address 7b724529b7881f7b27a249221993227c3b2b2f60 --password p@ssw0rd --ccid 01020304 --version v0.7 --filePath ./file_path/movie.avi --fee 500000
  ```
  - 리턴 예
  ```json
  {
    "product_id":"0"
  }
  ```

#### buy
  - 상품 구매
  - 구매 성공시 토큰 ID 반환
  - 잔고에서 상품 가격만큼 컨텐츠 제공자와 유통업자에게 지불
  - id에는 상품 ID 입력
  - 사용 예
  ``` bash
  $ node app.js regist --buy --address <address> --password <password> --id <id>
  $ node app.js regist --buy --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --id 0
  ```
  - 리턴 예
  ```json
  {
    "token_id":"0"
  }
  ```

#### open
  - 채널 개설
  - 개설 성공시 채널 ID 반환
  - API 내부에서 필요 deposit을 계산하여 예치함
  - id에는 토큰 ID 입력
  - 입력된 토큰 주인만이 정상적인 호출 가능
  - 사용 예
  ``` bash
  $ node app.js regist --open --address <address> --password <password> --id <id>
  $ node app.js regist --buy --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --id 0
  ```
  - 리턴 예
  ```json
  {
    "channel_id":"0"
  }
  ```

#### off
  - 채널 폐쇄
  - 컨트랙트 오너만 사용 (타 계정 사용시 오류 발생)
  - id에는 채널 ID 입력
  - 사용 예
  ``` bash
  $ node app.js regist --off --address <address> --password <password> --id <id>
  $ node app.js regist --off --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --id 0
  ```
  - 리턴 예
  ```json
  {
    "result":"succeed"
  }
  ```

#### settle
  - 채널 정산
  - 컨트랙트 오너만 사용 (타 계정 사용시 오류 발생)
  - id에는 채널 ID 입력
  - senders에는 sender의 주소를 ','로 구분하여 입력 (예: 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610,7b724529b7881f7b27a249221993227c3b2b2f60)
  - chunks에는 sender가 전송한 청크의 개수를 ','로 구분하여 입력 (예: 1024,9216)
  - 사용 예
  ``` bash
  $ node app.js regist --settle --address <address> --password <password> --id <id> --senders <senders> --chunks <chunks>
  $ node app.js regist --settle --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --id 0 --senders 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610,7b724529b7881f7b27a249221993227c3b2b2f60 --chunks 1024,9216 --id 0
  ```
  - 리턴 예
  ```json
  {
    "result":"succeed"
  }
  ```

## list
  - 자산 목록 반환 API
  - 데이터 / 상품 / 토큰의 ID 목록 반환
  - 옵션
    * data: 데이터 목록
    * product: 상품 목록
    * token: 토큰 목록
  - 파라미터
    * address: 사용할 계정의 주소
    * password: 계정의 패스워드

#### data
  - 데이터 목록
  - 자신이 소유한 데이터의 ID 목록 반환
  - 사용 예
  ``` bash
  $ node app.js list --data --address <address> --password <password>
  $ node app.js list --data --address 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  {
    "list":["0","1"]
  }
  ```

#### product
  - 상품 목록
  - 자신이 소유한 상품의 ID 목록 반환
  - 사용 예
  ``` bash
  $ node app.js list --product --address <address> --password <password>
  $ node app.js list --product --address 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  {
    "list":["0","1"]
  }
  ```

#### token
  - 토큰 목록
  - 자신이 소유한 토큰의 ID 목록 반환
  - 사용 예
  ``` bash
  $ node app.js list --token --address <address> --password <password>
  $ node app.js list --tokenk --address 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --password p@ssw0rd
  ```
  - 리턴 예
  ```json
  {
    "list":["0","1"]
  }
  ```

## details
  - 자산 정보 반환 API
  - 데이터 상세정보 / 파일 가격 / 상품 상세정보 / 토큰 상세정보 / 채널 생성에 필요한 deposit / 채널 상세 정보 반환
  - 옵션
    * data: 데이터 상세정보
    * file: 파일 가격
    * product: 상품 상세정보
    * token: 토큰 상세정보
    * deposit: 채널 생성에 필요한 deposit
    * channel: 채널 상세정보
  - 파라미터
    * address: 사용할 계정의 주소
    * password: 계정의 패스워드
    * id: 각종 ID(데이터 ID, 상품 ID, 토큰 ID, 채널 ID)
    * ccid: 데이터 CCID
    * version: 데이터 version
    * filePath: 파일 경로

#### data
  - 데이터 상세정보 반환 API
  - 사용 예
  ``` bash
  $ node app.js details --data --address <address> --password <password> --id <id>
  $ node app.js details --data --address 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --password p@ssw0rd --id 0
  ```
  - 리턴 예
  ```json
  {
    "details": {
      "owner": "0x62D7Ccd417C90F63860c1DAb3Bc421fa06DD2e52",
      "cid": "0",
      "ccid": "01020304",
      "version": "v0.7",
      "category": "movie",
      "subCategory": "commercial",
      "title": "avengers",
      "fileDetails": "{\"./file_path/subtitle.txt\":\"subtitle\",\"./file_path/movie.avi\":\"movie\"}"
    }
  }
  ```

#### file
  - 파일 가격 반환 API
  - 사용 예
  ``` bash
  $ node app.js details --file --address <address> --password <password> --ccid <ccid> --version <version> --filePath <filePath>
  $ node app.js details --file --address 9bcecd9085fae8fa787ac3f3bd3c2f25a90e0610 --password p@ssw0rd --ccid 01020304 --version v0.7 --filePath ./file_path/movie.avi
  ```
  - 리턴 예
  ```json
  {
    "fee":"50000"
  }
  ```

#### product
  - 상품의 상세정보 반환 API
  - 사용 예
  ``` bash
  $ node app.js details --product --address <address> --password <password> --id <id>
  $ node app.js details --product --address 7b724529b7881f7b27a249221993227c3b2b2f60 --password p@ssw0rd --id 0
  ```
  - 리턴 예
  ```json
  {
    "details": {
      "owner": "0x0d78440188459Bbf880FB98e60f8FdfBd9c8057B",
      "ccid": "01020304",
      "version": "v0.7",
      "filePath": "./file_path/movie.avi",
      "price": "500000"
    }
  }
  ```

#### token
  - 토큰의 상세정보 반환 API
  - 토큰 소유자만 호출 가능
  - 사용 예
  ``` bash
  $ node app.js details --token --address <address> --password <password> --id <id>
  $ node app.js details --token --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --id 0
  ```
  - 리턴 예
  ```json
  {
    "details": {
      "owner": "0xF2869f974a82EB59df913353882d40bD186cF353",
      "productId": "0",
      "state": "valid"
    }
  }
  ```

#### deposit
  - 채널 개설시 필요한 deposit 계산 API
  - 토큰 소유자만 호출 가능
  - 사용 예
  ``` bash
  $ node app.js details --deposit --address <address> --password <password> --id <id>
  $ node app.js details --deposit --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --id 0
  ```
  - 리턴 예
  ```json
  {
    "deposit":"1024000000000000"
  }
  ```

#### channel
  - 채널의 상세정보 반환 API
  - 사용 예
  ``` bash
  $ node app.js details --channel --address <address> --password <password> --id <id>
  $ node app.js details --channel --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --id 0
  ```
  - 리턴 예
  ```json
  {
    "details": {
      "receiver": "0xF2869f974a82EB59df913353882d40bD186cF353",
      "productId": "0",
      "deposit": "1024000000000000",
      "timestamp": "1555376800",
      "leftTime": "115792089237316195423570985008687907853269984665640564039457584007913129627571",
      "state": "off"
    }
  }
  ```

## sign
  - 서명 관련 API
  - 옵션
    * sign: 서명 생성
    * verify: 서명 검증
  - 파라미터
    * address: 사용할 계정의 주소
    * password: 계정의 패스워드
    * msg: 서명할 메시지
    * signature: 검증할 서명 (base64)
    * publicKey: 검증에 사용할 공개키 (base64)

#### sign
  - 서명 생성 API
  - 사용 예
  ``` bash
  $ node app.js sign --sign --msg <msg>
  $ node app.js sign --sign --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --msg "meesageToSign"
  ```
  - 리턴 예
  ```json
  {
    "sign": "b/wsU3rnQM4GqpAvzmiWkocx7RMC0HkTcXIaDUegjMdfyOMjt5UXVYyKRaGMImCfCKWfirjIQWk93kTxCWeCCiIxMTEi",
    "pubKey": "HxmvtuLjFdRXlXtxiSObgdz0Gj321ULXeuKkSOY/6C4="
  }
  ```

#### verify
  - 서명 생성 API
  - 사용 예
  ``` bash
  $ node app.js sign --verify --address <address> --password <password> --signature <signature> --publicKey <publicKey>
  $ node app.js sign --verify --address 1ee77618b9e4f7651381e2ede71b0d389f27a5c6 --password p@ssw0rd --signature b/wsU3rnQM4GqpAvzmiWkocx7RMC0HkTcXIaDUegjMdfyOMjt5UXVYyKRaGMImCfCKWfirjIQWk93kTxCWeCCiIxMTEi --publicKey HxmvtuLjFdRXlXtxiSObgdz0Gj321ULXeuKkSOY/6C4=
  ```
  - 리턴 예
  ```json
  {
    "msg":"meesageToSign"
  }
  ```
