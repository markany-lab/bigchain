# 텐서플로설치(without 아나콘다)
  ```bash
  $ sudo apt-get install python
  $ sudo apt-get install python-pip
  $ sudo apt-get install python-dev
  $ pip install jupyter
  $ pip install tensorflow # GPU버전은 pip3 install tensorflow-gpu
  $ vim ~/.bashrc
  ```
  ```
  # PATH=$HOME/.local/bin:$PATH
  ```

# troubleshooting
  - ImportError: cannot import name 'main'
  ```bash
  $ sudo python3 -m pip uninstall pip && sudo apt-get install python-pip --reinstall
  ```
  - matplotlib 재설치?
  ```bash
  pip uninstall matplotlib
  python -m pip install --upgrade pip
  pip install matplotlib
  ```

# 한글폰트 설치
  ```bash
  $ sudo apt-get install fonts-nanum*
  $ sudo fc-cache -fv


  $ cp /usr/share/fonts/truetype/nanum/Nanum* ~/.local/lib/python2.7/site-packages/matplotlib/mpl-data/fonts/ttf/
  $ rm -rf ~/.cache/matplotlib/*
  ```

# 참고 url
- 스텐포드 강의
  > https://www.coursera.org/learn/machine-learning/home/welcome
- 텐서플로우 파이썬 유투브 강의
  > https://www.youtube.com/watch?v=qxUD7fOseBQ&list=PLRx0vPvlEmdAbnmLH9yh03cw9UQU_o7PO
- 기타
  > https://github.com/golbin/TensorFlow-Tutorials
