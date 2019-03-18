# 온체인 APIs
 - 아래 API들은 commander npm 모듈을 이용하여 생성한 것이다.
 - 기본 형식은 node app.js 명령어 --옵션 --옵션 입력값이다.
 - 입력값은 <옵션>으로 표시한다.

## account
 - 계정 관련 API
 - 아래 옵션 중 index는 이더리움 계정 리스트의 인덱스를 뜻하며 계정 선택시 사용

### generate
 - 이더리움 계정 생성
 - 사이드체인 계정 생성
 - 이더리움 계정과 사이드체인 계정 연동
 $ node app.js account --generate --password <password>

### list
 - 이더리움 계정 리스트를 반환
 $ node app.js account --list

### import
 - 이더리움 개인키를 받아 계정을 불러오기
 - 사이드체인 계정 생성
 - 이더리움 계정과 사이드체인 계정 연동
 $ node app.js account --import --password <password> --prvKey <prvKey>

### export
 - 선택한 계정의 개인키 내보내기
 - index는 이더리움 list의 인덱스를 뜻함
 $ node app.js account --export --index <index> --password <password>

### remove
 - 선택한 계정 삭제
 $ node app.js account --remove --index <index>

### balance
 - 선택한 계정의 잔고 표시
 - 이더리움 잔고 표시
 - 사이드체인 잔고 표시
 $ node app.js account --balance --index <index> --password <password>

## send
 - 메인넷과 사이드체인간 이더 전송 API

### ethereum
 - 메잇넷에서 사이드체인으로 이더 전송
 $ node app.js send --ethereum --index <index> --password <password> --unit <unit> --amount <amount>

### dappchain
 - 사이드체인에서 메인넷 게이트웨이로 이더 전송
 $ node app.js send --dappchain --index <index> --password <password> -unit <unit> --amount <amount>

### withdraw
 - 메인넷 게이트웨이에서 이더리움으로 이더 전송
 $ node app.js send --withdraw --index <index> --password <password>

## data
 - 데이터 등록 관련 API

### register
 - 데이터 등록
 - 데이터 등록시 CID가 반환됨
 $ node app.js data --register --index <index> --password <password> --title <title>

### list
 - 선택한 계정이 등록한 데이터의 ID 리스트
 $ node app.js data --list --index <index> --password <password>

### details
 - 선택한 CID의 세부 정보
 $ node app.js data --details --index <index> --password <password> --cid <cid>

## contents
 - 컨텐츠 등록, 구매 등 컨텐츠 관련 API

### register
 - 컨텐츠 등록
 $ node app.js contents --register --index <index> --password <password> --title <title> --cid <cid> --fee <fee> --supply <supply>

### list
 - 선택한 계정이 등록한 컨텐츠의 ID 리스트
 $ node app.js contents --list --index <index> --password <password>

### details
 - 선택한 컨텐츠 ID의 세부 정보
 $ node app.js contents --details --index <index> --password <password> --cTokenId <cTokenId>

### buy
 - 선택한 컨텐츠 ID 구매
 $ node app.js contents --buy --index <index> --password <password> --cTokenId <cTokenId>

## token
 - 구매한 컨텐츠 토큰에 관한 API

### list
 - 구매한 컨텐츠 토큰의 ID 리스트
 $ node app.js token --list --index <index> --password <password>

### details
 - 선택한 컨텐츠 토큰 ID의 세부 정보
 $ node app.js token --details --index <index> --password <password> --uTokenId <uTokenId>
