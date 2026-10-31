/* =====================================================
   js/sample-data.js — demo content used ONLY when the
   Supabase keys in config.js are not filled in yet.
   Once Supabase is connected this file is ignored.
   Subject and unit names are samples: edit them to match
   your real syllabus (in Stage 2 you will do it from the
   Admin Portal, no code needed).
   ===================================================== */
window.MH_SAMPLE = {
  branches: [
    {
      id: 'b-cse', slug: 'cse', name: 'CSE', icon: '💻',
      full_name: 'Computer Science & Engineering',
      description: 'Programming, data structures, algorithms, databases, operating systems and more.',
      position: 1, published: true
    }
  ],
  subjects: [
    {
      id: 's-ds', branch_id: 'b-cse', semester: 3, code: null, name: 'Data Structures',
      description: 'Arrays, stacks, queues, linked lists, trees, graphs, sorting and hashing.',
      position: 1, published: true
    },
    {
      id: 's-dm', branch_id: 'b-cse', semester: 3, code: null, name: 'Discrete Structures',
      description: 'Sets, logic, algebraic structures, graph theory and combinatorics.',
      position: 2, published: true
    }
  ],
  units: [
    { id: 'u-ds1', subject_id: 's-ds', unit_number: 1, title: 'Introduction and Arrays', description: 'Algorithms, complexity, arrays and basic operations.', notes_path: null, iq_path: null, pyq_path: null, position: 1, published: true },
    { id: 'u-ds2', subject_id: 's-ds', unit_number: 2, title: 'Stacks and Queues', description: 'Stack and queue operations, applications, circular and priority queues.', notes_path: null, iq_path: null, pyq_path: null, position: 2, published: true },
    { id: 'u-ds3', subject_id: 's-ds', unit_number: 3, title: 'Linked Lists', description: 'Singly, doubly and circular linked lists with operations.', notes_path: null, iq_path: null, pyq_path: null, position: 3, published: true },
    { id: 'u-ds4', subject_id: 's-ds', unit_number: 4, title: 'Trees', description: 'Binary trees, BST, AVL trees, traversals and heaps.', notes_path: null, iq_path: null, pyq_path: null, position: 4, published: true },
    { id: 'u-ds5', subject_id: 's-ds', unit_number: 5, title: 'Graphs, Sorting and Hashing', description: 'Graph representation, BFS and DFS, sorting algorithms and hash tables.', notes_path: null, iq_path: null, pyq_path: null, position: 5, published: true },

    { id: 'u-dm1', subject_id: 's-dm', unit_number: 1, title: 'Sets, Relations and Functions', description: 'Set operations, relations, equivalence and functions.', notes_path: null, iq_path: null, pyq_path: null, position: 1, published: true },
    { id: 'u-dm2', subject_id: 's-dm', unit_number: 2, title: 'Propositional Logic', description: 'Propositions, truth tables, normal forms and inference.', notes_path: null, iq_path: null, pyq_path: null, position: 2, published: true },
    { id: 'u-dm3', subject_id: 's-dm', unit_number: 3, title: 'Algebraic Structures', description: 'Groups, rings, fields and lattices.', notes_path: null, iq_path: null, pyq_path: null, position: 3, published: true },
    { id: 'u-dm4', subject_id: 's-dm', unit_number: 4, title: 'Graph Theory', description: 'Graph types, paths, trees, planarity and colouring.', notes_path: null, iq_path: null, pyq_path: null, position: 4, published: true },
    { id: 'u-dm5', subject_id: 's-dm', unit_number: 5, title: 'Combinatorics', description: 'Counting principles, permutations, combinations and recurrence relations.', notes_path: null, iq_path: null, pyq_path: null, position: 5, published: true }
  ]
};
