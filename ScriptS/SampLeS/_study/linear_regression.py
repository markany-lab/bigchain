import tensorflow as tf

DataX = [1,2,3,4,5,6,7]
DataY = [25000,55000,75000,11000,128000,155000,180000]

PhX=tf.placeholder(tf.float32)
PhY=tf.placeholder(tf.float32)

A=tf.Variable(tf.random_uniform([1], -100, 100))
B=tf.Variable(tf.random_uniform([1], -100, 100))

H = A * PhX + B

P = tf.Variable(0.01)

Optimizer = tf.train.GradientDescentOptimizer(P)
Cost = tf.reduce_mean(tf.square(H - PhY))
Train = Optimizer.minimize(Cost)
init = tf.global_variables_initializer()

Sess = tf.Session()
Sess.run(init)

for i in range(5001):
    Sess.run(Train, feed_dict={PhX: DataX, PhY: DataY})
    if i % 500 == 0:
        print(i, Sess.run(Cost, feed_dict={PhX: DataX, PhY: DataY}), Sess.run(A), Sess.run(B))

print(Sess.run(H, feed_dict={PhX: [8, 10]}))
