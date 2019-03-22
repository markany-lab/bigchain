# -*- coding: utf-8 -*-
import tensorflow as tf

# X, Y축에 대한 학습 데이타
DataX = [1,2,3,4,5,6,7]
DataY = [25000,55000,75000,11000,128000,155000,180000]

# X, Y축에 대한 데이타 타입설정
PhX=tf.placeholder(tf.float32)
PhY=tf.placeholder(tf.float32)

# Y=AX+B에 대한 초기값(랜덤)
A=tf.Variable(tf.random_uniform([1], -100, 100))
B=tf.Variable(tf.random_uniform([1], -100, 100))

H = A * PhX + B # 가설식(1차방정식)

# 경사하강 알고리즘의 점프 간격
P = tf.Variable(0.01)

# 경사하강API 사용
Optimizer = tf.train.GradientDescentOptimizer(P)
Cost = tf.reduce_mean(tf.square(H - PhY)) # 비용합수 정의, (예측값-실측값)^2 들의 평균
Train = Optimizer.minimize(Cost)
init = tf.global_variables_initializer()

Sess = tf.Session()
Sess.run(init)

for i in range(5001):
    Sess.run(Train, feed_dict={PhX: DataX, PhY: DataY})
    if i % 500 == 0:
        print(i, Sess.run(Cost, feed_dict={PhX: DataX, PhY: DataY}), Sess.run(A), Sess.run(B))

# X축 8, 10 에 대한 Y축 예상치
print(Sess.run(H, feed_dict={PhX: [8, 10]}))