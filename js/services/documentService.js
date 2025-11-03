const documentService = {
    async getDocument(id) {
        const docRef = db.collection('docs').doc(id);
        const doc = await docRef.get();
        
        // 조회수 증가
        if (doc.exists) {
            await docRef.update({
                views: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        return { ...doc.data(), id: doc.id };
    },

    async getRecentDocuments(limit = 5) {
        const snapshot = await db.collection('docs')
            .orderBy('updatedAt', 'desc')
            .limit(limit)
            .get();
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            dateStr: new Date(doc.data().updatedAt.seconds * 1000).toLocaleString()
        }));
    },

    async getPopularDocuments(limit = 5) {
        const snapshot = await db.collection('docs')
            .orderBy('views', 'desc')
            .limit(limit)
            .get();
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));
    },

    async getAllTags() {
        const snapshot = await db.collection('docs').get();
        const tags = snapshot.docs.flatMap(doc => doc.data().tags || []);
        return [...new Set(tags)];
    },

    async getDocumentsByCategory(category, subcategory) {
        const snapshot = await db.collection('docs')
            .where('category', '==', category)
            .where('subcategory', '==', subcategory)
            .orderBy('updatedAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            dateStr: new Date(doc.data().updatedAt.seconds * 1000).toLocaleString()
        }));
    },

    async getDocumentsByTag(tag) {
        const snapshot = await db.collection('docs')
            .where('tags', 'array-contains', tag)
            .orderBy('updatedAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            dateStr: new Date(doc.data().updatedAt.seconds * 1000).toLocaleString()
        }));
    },

    async saveDocument(doc, editSummary = '') {
        const timestamp = firebase.firestore.Timestamp.now();
        const docData = {
            title: doc.title,
            content: doc.content,
            category: doc.category || '',
            subcategory: doc.subcategory || '',
            tags: doc.tags || [],
            editor: doc.editor || '익명',
            password: doc.password,
            updatedAt: timestamp,
            views: doc.id ? doc.views || 0 : 0,
            createdAt: doc.id ? doc.createdAt : timestamp
        };

        // 문서 저장
        let docRef;
        if (doc.id) {
            docRef = db.collection('docs').doc(doc.id);
            await docRef.update(docData);
        } else {
            docRef = await db.collection('docs').add(docData);
        }

        // 버전 히스토리 저장
        await db.collection('docs').doc(docRef.id)
            .collection('history')
            .add({
                content: doc.content,
                title: doc.title,
                editor: doc.editor || '익명',
                summary: editSummary,
                timestamp: timestamp
            });

        return docRef.id;
    },

    async getDocumentHistory(docId) {
        const snapshot = await db.collection('docs')
            .doc(docId)
            .collection('history')
            .orderBy('timestamp', 'desc')
            .get();
            
        return snapshot.docs.map(doc => doc.data());
    },

    generateTableOfContents(content) {
        const headings = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g) || [];
        return headings.map(heading => {
            const level = heading.match(/<h([1-6])/)[1];
            const text = heading.replace(/<[^>]+>/g, '');
            const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return { level, text, id };
        });
    }
};