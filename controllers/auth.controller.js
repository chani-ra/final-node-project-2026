   
register: async (req, res, ) => {
    const { error } = userValidationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }
    try {
        const newUser = await UserService.register(req.body);
        res.status(201).json({ message: "User registered successfully", token: generateJWTToken(newUser._id) ,  user: { id: newUser._id, email: newUser.email }});
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
},

  addUserByAdmin: async (req, res) => {
        const { error } = userValidationSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        
        try {
            const token = req.token; \\לשלוף מהאדר בצןרה אחרת 
            \\צריך לעשות פונקציה מיוחדת שמטפלת בהרשאות - היא מקבלת סיסמא - טוקו- ולפי הסיסמא היא שולפצ את היוזר מהדאטאבייס ואז בודקת האם הרול שווה מנהל או כל הרשאה אחרת
            const newUser = await UserService.addUserByAdmin(req.body, currentUser);
            res.status(201).json({ message: "User added successfully", user: newUser });
        } catch (error) {
            res.status(400).json({ message: error.message });
        }    },

    login: async (req, res) => {
        try {
            const token = await UserService.login(req.body.email, req.body.password);
            res.status(200).json({ message: "Login successful", token: token });
        } catch (error) {
            res.status(401).json({ message: error.message });
        }
    },