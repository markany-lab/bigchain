# 온체인 APIs
  - 아래 API들은 commander npm 모듈을 이용하여 생성한 것이다.
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
    * index: 계정의 index(list 명령어 결과의 순서)
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

#### list
 - 이더리움 계정 리스트를 반환
 - 사용 예
 $ node app.js account --list

#### import
 - 이더리움 개인키를 받아 계정을 불러오기
 - 사이드체인 계정 생성
 - 이더리움 계정과 사이드체인 계정 연동
 - 사용 예
 ```bash
 $ node app.js account --import --password <password> --privateKey <privateKey>
 $ node app.js account --import --password p@ssw0rd --privateKey 0x4E97E81D425966C00422A8FC5602382DA74862A239E941B2777AB0CB968D115B
 ```

#### export
 - 선택한 계정의 개인키 내보내기
 - index는 이더리움 list의 인덱스를 뜻함
 - 사용 예
 ```bash
 $ node app.js account --export --index <index> --password <password>
 $ node app.js account --export --index 0 --password p@ssw0rd
 ```

#### remove
 - 선택한 계정 삭제
 - 사용 예
 ``` bash
 $ node app.js account --remove --index <index>
 $ node app.js account --remove --index 1
 ```

#### balance
 - 선택한 계정의 잔고 표시
 - 이더리움 잔고 표시
 - 사이드체인 잔고 표시
 - 사용 예
 ```bash
 $ node app.js account --balance --index <index> --password <password>
 $ node app.js account --balance --index 1 --password p@ssw0rd
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

#### dappchain
 - 사이드체인에서 메인넷 게이트웨이로 이더 전송
 - 사용 예
 ``` bash
 $ node app.js send --dappchain --index <index> --password <password> -unit <unit> --amount <amount>
 $ node app.js send --dappchain --index 0 --password p@ssw0rd --unit ether --amount 0.01
 ```

#### withdraw
 - 메인넷 게이트웨이에서 이더리움으로 이더 전송
 - 사용 예
 ``` bash
 $ node app.js send --withdraw --index <index> --password <password>
 $ node app.js send --withdraw --index 0 --password p@ssw0rd
 ```


## data
 - 데이터 등록 관련 API
 - 옵션
  * register: 데이터 등록
  * list: 등록한 데이터의 목록(CID)
  * details: 등록한 데이터의 상세 정보
 - 파라미터
  * index: 계정의 index(list 명령어 결과의 순서)
  * password: 계정의 패스워드
  * title: 등록할 데이터의 이름
  * cid: 등록한 데이터의 CID

#### register
 - 데이터 등록
 - 데이터 등록시 CID가 반환됨
 - 사용 예
 ```bash
 $ node app.js data --register --index <index> --password <password> --title <title>
 $ node app.js data --register --index 1 --password p@ssw0rd --title test_title01
 ```

#### list
 - 등록한 데이터의 ID 리스트
 - 사용 예
 ``` bash
 $ node app.js data --list --index <index> --password <password>
 $ node app.js data --list --index 1 --password p@ssw0rd
 ```

#### details
 - 선택한 CID의 세부 정보
 - 사용 예
 ```bash
 $ node app.js data --details --index <index> --password <password> --cid <cid>
 $ node app.js data --details --index 1 --password p@ssw0rd --cid 0
 ```


## hash
 - 데이터에 대한 세부 해시 등록
 - 옵션
  * register: 해시 등록
  * list: 등록한 해시 리스트
  * details: 등록한 해시의 상세 정보
 - 파라미터
  * index: 계정의 index(list 명령어 결과의 순서)
  * password: 계정의 패스워드
  * cid: 해시 등록시 입력값: 데이터의 CID
  * fee: 해시 등록시 입력값: 등록된 해시의 가격
  * hash: 해시 등록시 입력값: 해시값

#### register
 - 해시 등록
 - 사용 예
 ```bash
 $ node app.js hash --register --index <index> --password <password> --cid <cid> --fee <fee> --hash <hash>
 $ node app.js hash --register --index 1 --password p@ssw0rd --cid 0 --fee 200 --hash 0xE29C9C180C6279B0B02ABD6A1801C7C04082CF486EC027AA13515E4F3884BB6B
 ```

#### list
 - 등록한 해시의 ID 리스트
 - 사용 예
 ```bash
 $ node app.js hash --list --index <index> --password <password>
 $ node app.js hash --list --index 1 --password p@ssw0rd
 ```

#### details
 - 선택한 해시의 세부 정보
 - 사용 예
 ``` bash
 $ node app.js hash --details --index <index> --password <password> --hash <hash>
 $ node app.js hash --details --index 1 --password p@ssw0rd --hash 0xE29C9C180C6279B0B02ABD6A1801C7C04082CF486EC027AA13515E4F3884BB6B
 ```


## product
 - 상품 등록 관련 API
 - 옵션
  * register: 상품 등록
  * list: 등록한 상품의 리스트
  * details: 등록한 상품의 상세 정보
  * buy: 상품 구매
 - 파라미터
  * index: 계정의 index(list 명령어 결과의 순서)
  * password: 계정의 패스워드
  * pTokenId: 상품의 고유 ID
  * hash: 해시값

#### register
 - 상품 등록
 - 사용 예
 ```bash
 $ node app.js product --register --index <index> --password <password --hash <hash>
 $ node app.js product --register --index 1 --password p@ssw0rd --hash 0xE29C9C180C6279B0B02ABD6A1801C7C04082CF486EC027AA13515E4F3884BB6B
 ```

#### list
 - 등록한 상품의 리스트
 - 사용 예
 ``` bash
 $ node app.js product --list --index <index> --password <password>
 $ node app.js product --list --index 1 --password p@ssw0rd
 ```

#### details
 - 등록한 상품의 상세 정보
 - 사용 예
 ``` bash
 $ node app.js product --details --index <index> --password <password> --pTokenId <pTokenId>
 $ node app.js product --details --index 1 --password p@ssw0rd --pTokenId 0
 ```

#### buy
 - 상품 구입
 - 사용 예
 ```bash
 $ node app.js product --buy --index <index> --password <password> --pTokenId <pTokenId>
 $ node app.js product --buy --index 0 --password p@ssw0rd --pTokenId 0
 ```
