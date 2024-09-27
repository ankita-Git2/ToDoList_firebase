import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const TodoList = () => {
  const [todoLists, setTodoLists] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [taskInputs, setTaskInputs] = useState({});
  const [draggedTask, setDraggedTask] = useState(null);

  const auth = getAuth();
  const navigate = useNavigate();

  // Fetch To-Do lists
  const fetchTodoLists = async (user) => {
    if (user) {
      try {
        const querySnapshot = await getDocs(
          collection(db, `users/${user.uid}/todoLists`)
        );
        const fetchedLists = await Promise.all(
          querySnapshot.docs.map(async (listDoc) => {
            const tasksSnapshot = await getDocs(
              collection(db, `users/${user.uid}/todoLists/${listDoc.id}/tasks`)
            );
            const tasks = tasksSnapshot.docs.map((taskDoc) => ({
              id: taskDoc.id,
              ...taskDoc.data(),
            }));
            return {
              id: listDoc.id,
              ...listDoc.data(),
              tasks,
            };
          })
        );
        setTodoLists(fetchedLists);
      } catch (error) {
        console.error("Error fetching To-Do Lists: ", error);
      }
    }
  };

  // Add a new To-Do List
  const addTodoList = async () => {
    const user = getAuth().currentUser;
    if (newListName.trim() && user) {
      try {
        await addDoc(collection(db, `users/${user.uid}/todoLists`), {
          name: newListName,
          createdBy: user.email,
          createdAt: new Date(),
        });
        fetchTodoLists(user);
        setNewListName("");
      } catch (error) {
        console.error("Error adding To-Do List: ", error);
      }
    }
  };

  // Handle input change for tasks
  const handleTaskInputChange = (listId, field, value) => {
    setTaskInputs((prev) => ({
      ...prev,
      [listId]: { ...prev[listId], [field]: value },
    }));
  };

  // Add a new task
  const addTask = async (listId) => {
    const user = getAuth().currentUser;
    const newTask = taskInputs[listId];
    if (newTask?.title.trim() && user) {
      try {
        await addDoc(
          collection(db, `users/${user.uid}/todoLists/${listId}/tasks`),
          {
            ...newTask,
            priority: newTask.priority || "low",
            createdAt: new Date(),
          }
        );
        fetchTodoLists(user);
        setTaskInputs((prev) => ({
          ...prev,
          [listId]: {
            title: "",
            description: "",
            dueDate: "",
            priority: "low",
          },
        }));
      } catch (error) {
        console.error("Error adding task: ", error);
      }
    }
  };

  // Update task priority
  const updateTaskPriority = async (listId, taskId, newPriority) => {
    const user = getAuth().currentUser;
    if (user) {
      try {
        const taskRef = doc(
          db,
          `users/${user.uid}/todoLists/${listId}/tasks`,
          taskId
        );
        await updateDoc(taskRef, { priority: newPriority });
        fetchTodoLists(user); // Refresh the data
      } catch (error) {
        console.error("Error updating task priority: ", error);
      }
    }
  };

  // Move a task to a different list
  const moveTaskToAnotherList = async (
    fromListId,
    toListId,
    task,
    newPriority
  ) => {
    const user = getAuth().currentUser;
    if (user) {
      try {
        // Add the task to the new list
        const newTaskData = { ...task, priority: newPriority };
        delete newTaskData.id;
        await addDoc(
          collection(db, `users/${user.uid}/todoLists/${toListId}/tasks`),
          newTaskData
        );

        // Remove the task from the old list
        await deleteDoc(
          doc(db, `users/${user.uid}/todoLists/${fromListId}/tasks`, task.id)
        );

        // Immediately update UI without fetching data again
        setTodoLists((prev) =>
          prev.map((list) =>
            list.id === fromListId
              ? {
                  ...list,
                  tasks: list.tasks.filter((t) => t.id !== task.id),
                }
              : list.id === toListId
              ? {
                  ...list,
                  tasks: [...list.tasks, { ...newTaskData, id: task.id }],
                }
              : list
          )
        );
      } catch (error) {
        console.error("Error moving task to another list: ", error);
      }
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Drag and drop for moving tasks between lists or updating priority
  const handleDragStart = (task, fromListId) => {
    setDraggedTask({ ...task, fromListId });
  };

  const handleDrop = async (toListId, newPriority = null) => {
    if (draggedTask) {
      const fromListId = draggedTask.fromListId;
      const isSameList = fromListId === toListId;

      if (newPriority) {
        if (isSameList) {
          // Update priority within the same list
          await updateTaskPriority(fromListId, draggedTask.id, newPriority);
        } else {
          // Move task to a different list and update its priority
          await moveTaskToAnotherList(
            fromListId,
            toListId,
            draggedTask,
            newPriority
          );
        }
      }
      setDraggedTask(null);
    }
  };

  const handleScrollOnDrag = (event) => {
    const SCROLL_THRESHOLD = 100;
    const scrollStep = 10;

    if (event.clientY < SCROLL_THRESHOLD) {
      window.scrollBy(0, -scrollStep);
    } else if (window.innerHeight - event.clientY < SCROLL_THRESHOLD) {
      window.scrollBy(0, scrollStep);
    }
  };
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchTodoLists(user);
      } else {
        setTodoLists([]);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  return (
    <div
      className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-100 p-8"
      onDragOver={handleScrollOnDrag}
    >
      <div className="max-w-4xl mx-auto p-6 bg-white shadow-xl rounded-lg overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-indigo-600">To-Do App</h2>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        <div className="mb-4 flex justify-between">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="input-field flex-1 p-2 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Create new To-Do List"
          />
          <button
            onClick={addTodoList}
            className="ml-4 bg-indigo-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-indigo-600 transition"
          >
            Add List
          </button>
        </div>

        <div className="grid lg:grid-cols-2 grid-cols-1 gap-4">
          {todoLists.map((list) => (
            <div
              key={list.id}
              className="p-4 bg-gray-100 rounded-lg shadow-md"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(list.id)}
            >
              <h3 className="text-xl font-bold text-indigo-700 mb-4">
                {list.name}
              </h3>

              <div className="mb-4">
                <input
                  type="text"
                  value={taskInputs[list.id]?.title || ""}
                  onChange={(e) =>
                    handleTaskInputChange(list.id, "title", e.target.value)
                  }
                  className="p-2 border rounded-md mb-2"
                  placeholder="Task Title"
                />
                <input
                  type="text"
                  value={taskInputs[list.id]?.description || ""}
                  onChange={(e) =>
                    handleTaskInputChange(
                      list.id,
                      "description",
                      e.target.value
                    )
                  }
                  className="p-2 border rounded-md mb-2"
                  placeholder="Task Description"
                />
                <input
                  type="date"
                  value={taskInputs[list.id]?.dueDate || ""}
                  onChange={(e) =>
                    handleTaskInputChange(list.id, "dueDate", e.target.value)
                  }
                  className="p-2 border rounded-md mb-2"
                />
                <select
                  value={taskInputs[list.id]?.priority || "low"}
                  onChange={(e) =>
                    handleTaskInputChange(list.id, "priority", e.target.value)
                  }
                  className="p-2 border rounded-md mb-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button
                  onClick={() => addTask(list.id)}
                  className="block bg-indigo-500 text-white px-4 py-2 rounded-md shadow-md mt-2"
                >
                  Add Task
                </button>
              </div>

              {["low", "medium", "high"].map((priority) => (
                <div
                  key={priority}
                  onDrop={() => handleDrop(list.id, priority)}
                  onDragOver={(e) => e.preventDefault()}
                  className={`p-4 rounded-lg shadow-md mt-2 ${
                    priority === "high"
                      ? "bg-red-300"
                      : priority === "medium"
                      ? "bg-yellow-300"
                      : "bg-green-300"
                  }`}
                >
                  <h4 className="font-semibold capitalize">
                    {priority} Priority
                  </h4>
                  {list.tasks
                    .filter((task) => task.priority === priority)
                    .map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task, list.id)}
                        className="bg-white p-2 mt-2 rounded-md shadow-md"
                      >
                        <h5 className="font-bold">{task.title}</h5>
                        <p className="text-sm">{task.description}</p>
                        <p className="text-xs text-gray-500">{task.dueDate}</p>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TodoList;