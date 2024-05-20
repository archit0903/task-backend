const express = require('express');

const path = require('path');
const cors = require('cors');
const app = express();
const port = 4000;
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const multer = require('multer');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'iamgreat000',
  database: 'Task',
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database');
});
// Middleware
app.use(express.json());
app.use(cors());
// Set storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'C:/Users/sirki/OneDrive/Desktop/task-backend/Files'); // Specify the directory where files will be stored
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

// Initialize multer upload
const upload = multer({ storage });
// Routes
app.get('/', (req, res) => {
  res.send('Hello, World!');
});
app.post('/signup', (req, res) => {
    const { name, email, password, role } = req.body;
  
    // Check if an admin already exists
    if (role === 'admin') {
      connection.query(
        'SELECT * FROM users WHERE role = ?',
        [role],
        (error, results) => {
          if (error) {
            console.error('Error checking admin:', error);
            res.status(500).json({ message: 'Internal Server Error' });
          } else {
            if (results.length > 0) {
              res.status(400).json({ message: 'Admin already exists' });
            } else {
              createUser();
            }
          }
        }
      );
    } else {
      createUser();
    }
  
    // Function to create the user
    function createUser() {
      // Hash the password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          res.status(500).json({ message: 'Internal Server Error' });
          return;
        }
  
        // Insert the user into the database
        const insertQuery = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
        connection.query(insertQuery, [name, email, hashedPassword, role], (err, result) => {
          if (err) {
            console.error('Error creating user:', err);
            res.status(500).json({ message: 'Internal Server Error' });
            return;
          }
          res.status(201).json({ message: 'User created successfully' });
        });
      });
    }
  });
  
  app.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    // Perform database query to retrieve the user based on the provided email
    connection.query(
      'SELECT * FROM users WHERE email = ?',
      [email],
      (error, results) => {
        if (error) {
          res.status(500).json({ error: 'Internal server error' });
        } else {
          if (results.length > 0) {
            const user = results[0];
            const role = user.role; // Retrieve the role from the user record
            const name = user.name; // Retrieve the name from the user record
  
            // Compare the provided password with the hashed password stored in the database
            bcrypt.compare(password, user.password, (err, match) => {
              if (match) {
                // Passwords match, authentication successful
                res.status(200).json({ role, name }); // Send the role and name back to the frontend
              } else {
                // Passwords don't match, authentication failed
                res.status(401).json({ error: 'Invalid credentials' });
              }
            });
          } else {
            // User not found with the provided email
            res.status(401).json({ error: 'Invalid credentials' });
          }
        }
      }
    );
  });
  app.get('/notifications/:username', (req, res) => {
    const username = req.params.username;
    const selectQuery = 'SELECT * FROM notifications WHERE recipient = ?';
    connection.query(selectQuery, [username], (error, results) => {
      if (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      } else {
        res.status(200).json(results);
      }
    });
  });
  
  app.post('/notifications', (req, res) => {
    const { recipient, notificationText } = req.body;
  
    const insertQuery = 'INSERT INTO notifications (recipient, notificationText) VALUES (?, ?)';
    connection.query(insertQuery, [recipient, notificationText], (err, result) => {
      if (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ message: 'Internal Server Error' });
      } else {
        res.status(201).json({ message: 'Notification sent successfully' });
      }
    });
  });
  

  app.get('/users', (req, res) => {
    connection.query('SELECT * FROM users WHERE role = ?', ['user'], (error, results) => {
      if (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      } else {
        res.status(200).json(results);
      }
    });
  });
  app.delete('/notifications/:id', (req, res) => {
    const notificationId = req.params.id;
    const deleteQuery = 'DELETE FROM notifications WHERE id = ?';
    connection.query(deleteQuery, [notificationId], (error, result) => {
      if (error) {
        console.error('Error removing notification:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      } else {
        res.status(200).json({ message: 'Notification removed successfully' });
      }
    });
  });
  // GET all tasks
app.get('/tasks', (req, res) => {
  connection.query('SELECT * FROM tasks', (error, results) => {
    if (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      res.status(200).json(results);
    }
  });
});
app.get('/tasks/:assignedMember', (req, res) => {
  const { assignedMember } = req.params;
  connection.query('SELECT * FROM tasks WHERE assignedMembers = ?', [assignedMember], (error, results) => {
    if (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      res.status(200).json(results);
    }
  });
});
// POST a new task
app.post('/tasks', (req, res) => {
  const { name, deadline, assignedMembers, notes, completed } = req.body;
  const task = {
    name,
    deadline,
    assignedMembers,
    notes,
    completed,
  };

  connection.query('INSERT INTO tasks SET ?', task, (error, result) => {
    if (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      res.status(201).json({ id: result.insertId });
    }
  });
});

// PUT/update a task deadline
app.put('/tasks/:id/deadline', (req, res) => {
  const { id } = req.params;
  const { deadline } = req.body;

  connection.query('UPDATE tasks SET deadline = ? WHERE id = ?', [deadline, id], (error) => {
    if (error) {
      console.error('Error updating task deadline:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Task deadline updated successfully' });
    }
  });
});

// DELETE a task
app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;

  connection.query('DELETE FROM tasks WHERE id = ?', [id], (error) => {
    if (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Task deleted successfully' });
    }
  });
});

app.put('/tasks/:id/completed', (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  connection.query('UPDATE tasks SET completed = ? WHERE id = ?', [completed, id], (error) => {
    if (error) {
      console.error('Error updating task completion status:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Task completion status updated successfully' });
    }
  });
});
app.put('/tasks/:id/status', (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  connection.query('UPDATE tasks SET completed = ? WHERE id = ?', [completed, id], (error) => {
    if (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      res.status(200).json({ message: 'Task status updated successfully' });
    }
  });
});
app.get('/members', (req, res) => {
  connection.query('SELECT u.id, u.name, COUNT(t.id) AS totalTasks FROM users u LEFT JOIN tasks t ON FIND_IN_SET(u.name, t.assignedMembers) > 0 WHERE u.role = "user" GROUP BY u.id, u.name', (error, members) => {
    if (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      res.status(200).json(members);
    }
  });
});

app.post('/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const { task, recipient } = req.body;
  const { filename, path: filepath } = req.file;

  // Save the file details to the MySQL database
  connection.query(
    'INSERT INTO files (filename, filepath, task, recipient) VALUES (?, ?, ?, ?)',
    [filename, filepath, task, recipient],
    (error, result) => {
      if (error) {
        console.error('Error saving file details:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
      }
      
      return res.status(200).json({ message: 'File uploaded successfully' });
    }
  );
});
app.get('/files/:recipientName', (req, res) => {
  const recipientName = req.params.recipientName;

  // Query the files table based on the recipient's name
  connection.query(
    'SELECT * FROM files WHERE recipient = ?',
    [recipientName],
    (error, files) => {
      if (error) {
        console.error('Error fetching shared files:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      return res.status(200).json(files);
    }
  );
});

app.get('/files/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'Files', filename);

  // Send the file as a response with appropriate headers
  res.download(filePath, filename, (error) => {
    if (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({ message: 'Error downloading file' });
    }
  });
});

  
// Start the server
app.listen(port);
