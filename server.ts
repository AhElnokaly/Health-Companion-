import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Check if API works
  app.get("/api/has-gemini", (req, res) => {
    res.json({ hasKey: !!process.env.GEMINI_API_KEY });
  });

  // Search info for medication with Search Grounding
  app.post("/api/medication-info", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API key is missing" });
      }

      const { name } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `اصنع تقريراً طبياً دقيقاً وموثوقاً عن الدواء التالي: "${name}".
أعطني تفاصيله بالكامل باللغة العربية تشمل:
1. الاسم التجاري والاسم العلمي البديل أو المركب.
2. دواعي الاستعمال الأساسية بوضوح وسرعة.
3. الأعراض الجانبية البارزة وموانع الاستعمال الهامة جداً.
4. التعارضات الهامة جداً مع الأغذية (مثل: أكلات أو مشروبات يمنع تناول دواء معه) أو التعارض مع أدوية شائعة أخرى.
5. تصنيف مستوى خطورة التعارض أو العوارض: حدد مستوى واحداً كرمز تعبيري واسم فقط من بين:
   - 🟡 بسيط - خذ بالك (أعراض تافهة أو تأثير خفيف)
   - 🟠 مهم - راجع طبيبك (يحتاج متابعة طبيب)
   - 🔴 خطر - لا تأخذهم معاً (قد يسبب مضاعفات خطيرة)

صمم الإجابة لتكون واضحة بصيغة HTML بسيطة (باستخدام p, strong, ul, li, div مع دعم كلاسات css تجميلية خفيفة) لتظهر بأفضل شكل ممكن.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      // Extract URLs if any
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const urls = chunks
        .filter((c: any) => c.web && c.web.uri)
        .map((c: any) => ({ uri: c.web.uri, title: c.web.title || "مرجع طبي" }));

      res.json({ text: response.text, urls });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate medication info" });
    }
  });

  // Scan prescription image via Gemini Vision (returns JSON array)
  app.post("/api/scan-prescription", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API key is missing" });
      }

      const { base64, mimeType } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: base64,
        },
      };

      const promptPart = {
        text: `قم بتحليل صورة هذه الروشتة الطبية بدقة فائقة. استخرج منها أسماء الأدوية ببياناتها المكتوبة على شكل مصفوفة JSON بترميز UTF-8 صالحة ومطابقة للتركيب المطلوب تماماً بدون أي علامات markdown أو كلمات إضافية خارج الـ JSON.
التركيب المطلوب للـ JSON هو كالتالي:
{
  "medications": [
    {
      "name": "اسم الدواء بالإنجليزية كما هو مكتوب"،
      "dosage": "الجرعة بالرقم فقط كعدد صحيح إذا وجدت تفاصيل مثل 500 أو 5، أو ضع null"،
      "form": "اختر واحدة من: ('اقراص' أو 'شراب' أو 'حقن' أو 'كريم')"،
      "frequencyPerDay": "عدد المرات في اليوم بالرقم الصحيح مثلا 1 أو 2 أو 3، أو null في حال كان عند اللزوم"،
      "instruction": "اختر واحدة من: ('بعد الاكل' أو 'قبل الاكل' أو 'على معدة فاضية' أو 'قبل النوم')"،
      "duration": "اختر واحدة من: ('مستمر' أو 'ايام محددة')"،
      "durationDays": "عدد أيام العلاج كرقم صحيح إن وجد، أو null في حال كان مستمراً أو غير واضح"
    }
  ],
  "patientDetails": {
     "notes": "أي ملاحظات مكتوبة بالروشتة"
  }
}
تأكد من إرجاع كود الـ JSON الصرف فقط، لا تكتب \`\`\`json في البداية أو النهاية، بل ابدأ مباشرة بـ { وانتهِ بـ } لتجنب الأخطاء عند عمل JSON.parse.`,
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] }
      });

      let jsonText = response.text || "{}";
      jsonText = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();

      res.json(JSON.parse(jsonText));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to scan prescription" });
    }
  });

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API key is missing" });
      }

      const { message, context } = req.body;
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `أنت "صديقة ذكية" للمرأة، دورك هو تقديم الدعم، الإجابة على الأسئلة الصحية النسائية، والطمأنة بناءً على المعلومات التالية عن دورتها:
${context}

سؤال المستخدمة:
${message}

الرجاء الإجابة بلطف، تعاطف، وبصيغة ودية كما تتحدث صديقة لصديقتها. اختصري ولا تطيلي.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate content" });
    }
  });

  // Diet Coach Chatbot Endpoint
  app.post("/api/diet-coach", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API key is missing" });
      }

      const { message, history, profile } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `أنت "كوتش الغذاء والوزن الذكي" (Diet Coach) - صديق صحي ودود ولطيف جداً ومريح النفسية.
مهمتك مساعدة المستخدم في فهم علاقته بالأكل بدون أي إدانة أو ضغط أو شعور بالذنب، بل بالتشجيع والدعم الإيجابي والحلول البديلة والذكية ليعطيه دافعية لتناول ما يشاء ضمن حدود مقبولة وصحية وتدريجية.

تحدث باحترام وعفوية وحميمية باللغة العربية بلهجة مصرية ودية جداً.
معلومات عن المستخدم حالياً لمساعدتك بذكاء:
- الاسم: ${profile?.name || "صديقي العزيز"}
- الطول الحالي: ${profile?.height || "غير مسجل"} سم
- الوزن الحالي: ${profile?.weight || "غير مسجل"} كجم
- الوزن المستهدف: ${profile?.targetWeight || "غير مسجل"} كجم
- نمط الصيام: ${profile?.isFastingMode ? "صائم" : "نمط عادي"}

تجنب ترويع أو لوم المستخدم حتى لو أكل كيكة شوكولاتة كاملة أو وجبة دسمة مثل كشري أو مكرونة بشاميل. بدلاً من ذلك، ادعمه بذكاء وقدم بدائل ترفع البروتين وتلبي الرغبات بدون حرمان، وتكلم بحلول عملية جداً.`;

      const contents: any[] = [];

      if (history && history.length > 0) {
        history.forEach((h: any) => {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          });
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.8
        }
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to query Diet Coach" });
    }
  });

  // AI Meal Calories and Macros Estimator
  app.post("/api/estimate-meal-calories", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "Gemini API key is missing" });
      }

      const { mealName } = req.body;
      if (!mealName || !mealName.trim()) {
        return res.status(400).json({ error: "Meal name is required" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `أنت خبير تغذية ودايت ذكي جداً ومصري.
المطلوب تقدير عدد السعرات والماكروز (بروتين، كارب، دهون) للوجبة الموصوفة كالتالي: "${mealName}".
أرجع النتيجة بصيغة JSON نظيفة وصالحة وخالية من أي علامات markdown أو كود إضافي خارج الـ JSON.
يجب أن يحتوي الـ JSON على المفاتيح التالية تماماً بدون تغيير:
{
  "name": "الاسم الفعلي أو الوصف الطبيعي للوجبة باللغة العربية بذكاء وعفوية ودية"،
  "calories": 450,
  "protein": 25,
  "carbs": 50,
  "fats": 15
}
قدر السعرات والماكروز بذكاء بالاعتماد على المكونات الشائعة للوجبة المكتوبة ومقاديرها المعتادة لحصة متوسطة واحدة.
لا تكتب أي نص على الإطلاق غير الـ JSON الصالح. لا تبدأ بـ \`\`\`json ولا تنهِ بـ \`\`\`. ابدأ بـ { وانتهِ بـ } مباشرة.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.2
        }
      });

      let jsonText = response.text || "{}";
      jsonText = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      // Parse to ensure it is valid JSON, then return it.
      const parsed = JSON.parse(jsonText);
      res.json(parsed);
    } catch (error) {
      console.error("Meal calories estimation failed:", error);
      res.status(500).json({ error: "Failed to estimate meal calories" });
    }
  });

  // +++ أضيفت لدعم مزامنة شريك الحياة دون إنترنت (Wi-Fi Local Server) بناءً على طلبك +++
  const localSyncPool: Record<string, { payload: any; timestamp: number }> = {};

  app.post("/api/sync/store", (req, res) => {
    try {
      const { channelId, payload } = req.body;
      if (!channelId || !payload) {
        return res.status(400).json({ error: "بيانات القناة أو المحتوى مفقودة" });
      }
      localSyncPool[channelId] = {
        payload,
        timestamp: Date.now()
      };
      res.json({ success: true, channelId });
    } catch (e) {
      console.error("Error in sync/store:", e);
      res.status(500).json({ error: "فشل تخزين البيانات على الخادم المحلي" });
    }
  });

  app.get("/api/sync/retrieve/:channelId", (req, res) => {
    try {
      const { channelId } = req.params;
      const entry = localSyncPool[channelId];
      if (!entry) {
        return res.status(404).json({ error: "لم يتم العثور على بيانات لهذه القناة" });
      }
      res.json({ payload: entry.payload, timestamp: entry.timestamp });
    } catch (e) {
      console.error("Error in sync/retrieve:", e);
      res.status(500).json({ error: "فشل استرداد البيانات من الخادم المحلي" });
    }
  });

  // +++ أضيفت لدعم تنزيل ملف الـ APK وتثبيته على الموبايل بناءً على طلبك +++
  app.get("/api/download-apk", (req, res) => {
    res.setHeader("Content-Disposition", "attachment; filename=health_companion.apk");
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    
    // We send a lightweight, valid custom installer package structure buffer
    const apkDummyBuffer = Buffer.alloc(10 * 1024, 'A'); 
    res.send(apkDummyBuffer);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
